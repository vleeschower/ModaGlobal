import { Request, Response } from 'express';
import { logger } from '../utils/Logger';
import { getConnection } from '../config/Db';
import { v4 as uuidv4 } from 'uuid';
import xss from 'xss'; // Librería Anti-XSS
import { publicarEvento } from '../events/EventPublisher';

// GET: Público (Clientes, Cajeros, Admins) con PAGINACIÓN
export const obtenerProductos = async (req: Request, res: Response): Promise<void> => {
    try {
        // 1. Recibimos parámetros de la URL (Ej: /api/productos?page=1&limit=20)
        // Si no los envían, usamos la página 1 y un límite de 20 por defecto.
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        
        // Validación de seguridad para que no pidan 1 millón de registros de golpe
        const safeLimit = limit > 100 ? 100 : limit; 
        const offset = (page - 1) * safeLimit;

        const pool = await getConnection();
        
        // 2. Consulta de Paginación Avanzada (SQL Server 2012+)
        const result = await pool.request()
            .input('offset', offset)
            .input('limit', safeLimit)
            .query(`
                -- Obtenemos el total de productos para que el frontend sepa cuántas páginas hay
                DECLARE @TotalRecords INT = (SELECT COUNT(*) FROM dbo.productos WHERE deleted_at IS NULL);

                -- Obtenemos solo la "rebanada" de productos solicitada
                SELECT id_producto, nombre, descripcion, precio_base, imagen_url, id_categoria 
                FROM dbo.productos 
                WHERE deleted_at IS NULL
                ORDER BY created_at DESC -- Los más nuevos primero
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

                -- Devolvemos el total también
                SELECT @TotalRecords as total_registros;
            `);
        
        // 3. Formateamos la respuesta como las APIs de clase mundial
        // Le indicamos a TypeScript que trate los recordsets como un arreglo genérico
        const recordsets = result.recordsets as any[]; 
        
        const productos = recordsets[0];
        const totalRegistros = recordsets[1][0].total_registros;
        const totalPaginas = Math.ceil(totalRegistros / safeLimit);

        res.status(200).json({ 
            success: true, 
            meta: {
                pagina_actual: page,
                productos_por_pagina: safeLimit,
                total_productos: totalRegistros,
                total_paginas: totalPaginas
            },
            data: productos 
        });

    } catch (error) {
        logger.error('Error obteniendo catálogo paginado', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// POST: Protegido (Solo Admins y SuperAdmins)
export const crearProducto = async (req: any, res: Response): Promise<void> => {
    try {
        const { nombre, descripcion, precio_base, sku, id_categoria, stock_inicial } = req.body;
        // ESTRATEGIA DE SEGURIDAD 4: Verificar si la subida fue exitosa
        if (!req.file) {
            res.status(400).json({ error: 'La imagen del producto es obligatoria.' });
            return;
        }
        const imagenUrlSegura = req.file.path; // URL de Cloudinary (https)
        const idUsuarioReal = req.headers['x-user-id'] || 'SISTEMA'; 
        const precioNum = parseFloat(precio_base);
        const stockNum = parseInt(stock_inicial) || 0;

        // 1. Sanitización Anti-XSS (Limpiamos textos que el usuario pueda ver)
        const nombreLimpio = xss(nombre);
        const descLimpia = xss(descripcion);

        const pool = await getConnection();
        const idProducto = `prod-${uuidv4().substring(0,8)}`;
        const idAuditoria = `aud-${uuidv4().substring(0,8)}`;
        const valoresNuevos = JSON.stringify({ nombre: nombreLimpio, precio_base, sku });

        // 2. Consulta Parametrizada (Anti-SQL Injection)
        await pool.request()
            .input('id_producto', idProducto)
            .input('nombre', nombreLimpio)
            .input('descripcion', descLimpia)
            .input('id_categoria', id_categoria)
            .input('precio_base', precioNum)
            .input('sku', sku)
            .input('imagen_url', imagenUrlSegura) // Guardamos la URL segura
            .input('id_usuario', idUsuarioReal)
            .input('id_auditoria', idAuditoria)
            .input('valores_nuevos', valoresNuevos)
            .input('ip_origen', req.ip || '127.0.0.1')
            .query(`
                BEGIN TRANSACTION;
                
                INSERT INTO dbo.productos (id_producto, nombre, descripcion, id_categoria, precio_base, sku, imagen_url, created_by)
                VALUES (@id_producto, @nombre, @descripcion, @id_categoria, @precio_base, @sku, @imagen_url, @id_usuario);

                INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                VALUES (@id_auditoria, @id_usuario, 'productos', @id_producto, 'INSERT', @valores_nuevos, @ip_origen);
                
                COMMIT TRANSACTION;
            `);

        logger.info(`Producto ${idProducto} creado en Base de Datos.`);
        
        const tiendaDestino = req.usuarioTiendaId || req.body.id_tienda;
        // ==========================================
        // 3. ¡LA MAGIA DE LOS EVENTOS OCURRE AQUÍ!
        // ==========================================
        // Le avisamos a toda la empresa (incluyendo Inventarios) que hay un nuevo producto
        await publicarEvento('PRODUCTO_CREADO', {
            id_producto: idProducto,
            nombre: nombreLimpio,
            stock_inicial: stockNum || 0, // Inventarios usará esto
            precio_base: precio_base,
            id_tienda: tiendaDestino // <-- NUEVO: Propagamos la tienda para que Inventarios sepa dónde crear el stock
        });

        res.status(201).json({ success: true, message: 'Producto creado, auditado y propagado en la red.' });

    } catch (error) {
        logger.error('Error creando producto', error);
        res.status(500).json({ error: 'Fallo al procesar la alta del producto' });
    }
};

// DELETE: Protegido (Solo SuperAdmin) - Soft Delete
export const eliminarProducto = async (req: any, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const idUsuarioReal = req.headers['x-user-id'];

        const pool = await getConnection();
        const idAuditoria = `aud-${uuidv4().substring(0,8)}`;

        await pool.request()
            .input('id_producto', id)
            .input('id_usuario', idUsuarioReal)
            .input('id_auditoria', idAuditoria)
            .input('ip_origen', req.ip || '127.0.0.1')
            .query(`
                BEGIN TRANSACTION;
                
                UPDATE dbo.productos 
                SET deleted_at = SYSUTCDATETIME(), deleted_by = @id_usuario
                WHERE id_producto = @id_producto AND deleted_at IS NULL;

                INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, ip_origen)
                VALUES (@id_auditoria, @id_usuario, 'productos', @id_producto, 'SOFT_DELETE', @ip_origen);
                
                COMMIT TRANSACTION;
            `);

        res.status(200).json({ success: true, message: 'Producto eliminado del catálogo.' });
    } catch (error) {
        logger.error('Error eliminando producto', error);
        res.status(500).json({ error: 'Fallo al eliminar' });
    }
};

// ==========================================
// MÓDULO: CATEGORÍAS
// ==========================================
export const obtenerCategorias = async (req: Request, res: Response): Promise<void> => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT id_categoria, nombre, descripcion 
            FROM dbo.categorias 
            WHERE deleted_at IS NULL
        `);
        res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
        logger.error('Error obteniendo categorías', error);
        res.status(500).json({ error: 'Error al consultar categorías' });
    }
};

// ==========================================
// MÓDULO: PROMOCIONES (Descuentos programados)
// ==========================================
export const crearPromocion = async (req: any, res: Response): Promise<void> => {
    try {
        const { id_producto, descuento, fecha_inicio, fecha_fin } = req.body;
        const idUsuarioReal = req.headers['x-user-id'];

        // Validación de negocio: La fecha final debe ser mayor a la inicial
        if (new Date(fecha_inicio) >= new Date(fecha_fin)) {
            res.status(400).json({ error: 'La fecha de fin debe ser posterior a la fecha de inicio.' });
            return;
        }

        const pool = await getConnection();
        const idPromocion = `promo-${uuidv4().substring(0,8)}`;
        const idAuditoria = `aud-${uuidv4().substring(0,8)}`;
        const valoresNuevos = JSON.stringify({ descuento, fecha_inicio, fecha_fin });

        await pool.request()
            .input('id_promocion', idPromocion)
            .input('id_producto', id_producto)
            .input('descuento', descuento) // Ej. 15.50 para 15.5%
            .input('fecha_inicio', fecha_inicio)
            .input('fecha_fin', fecha_fin)
            .input('id_usuario', idUsuarioReal)
            .input('id_auditoria', idAuditoria)
            .input('valores_nuevos', valoresNuevos)
            .input('ip_origen', req.ip || '127.0.0.1')
            .query(`
                BEGIN TRANSACTION;
                
                INSERT INTO dbo.promociones (id_promocion, id_producto, descuento, fecha_inicio, fecha_fin, created_by)
                VALUES (@id_promocion, @id_producto, @descuento, @fecha_inicio, @fecha_fin, @id_usuario);

                INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                VALUES (@id_auditoria, @id_usuario, 'promociones', @id_promocion, 'INSERT', @valores_nuevos, @ip_origen);
                
                COMMIT TRANSACTION;
            `);

        res.status(201).json({ success: true, message: 'Promoción programada exitosamente.' });
    } catch (error) {
        logger.error('Error creando promoción', error);
        res.status(500).json({ error: 'Fallo al registrar la promoción' });
    }
};

// ==========================================
// MÓDULO: PROVEEDORES (Relación Muchos a Muchos)
// ==========================================
// src/controllers/ProductController.ts

export const crearProveedor = async (req: any, res: Response): Promise<void> => {
    try {
        const { 
            nombre, 
            identificacion_fiscal, 
            nombre_representante, 
            email_contacto, 
            telefono, 
            dias_credito 
        } = req.body;
        
        const idUsuarioReal = req.headers['x-user-id'] || 'SISTEMA';

        const pool = await getConnection();
        const idProveedor = `prov-${uuidv4().substring(0,8)}`;
        const idAuditoria = `aud-${uuidv4().substring(0,8)}`;

        // Sanitización básica
        const nombreLimpio = xss(nombre);
        const repLimpio = xss(nombre_representante);

        await pool.request()
            .input('id_proveedor', idProveedor)
            .input('nombre', nombreLimpio)
            .input('identificacion_fiscal', identificacion_fiscal)
            .input('nombre_representante', repLimpio)
            .input('email', xss(email_contacto))
            .input('tel', telefono)
            .input('credito', dias_credito || 0)
            .input('id_usuario', idUsuarioReal)
            .input('id_auditoria', idAuditoria)
            .query(`
                BEGIN TRANSACTION;

                INSERT INTO dbo.proveedores (
                    id_proveedor, nombre, identificacion_fiscal, 
                    nombre_representante, email_contacto, telefono, 
                    dias_credito, activo, created_by
                )
                VALUES (
                    @id_proveedor, @nombre, @identificacion_fiscal, 
                    @nombre_representante, @email, @tel, 
                    @credito, 1, @id_usuario
                );

                INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, ip_origen)
                VALUES (@id_auditoria, @id_usuario, 'proveedores', @id_proveedor, 'INSERT', 'SISTEMA');

                COMMIT TRANSACTION;
            `);

        res.status(201).json({ success: true, message: 'Proveedor registrado con éxito' });
    } catch (error) {
        logger.error('Error al crear proveedor', error);
        res.status(500).json({ error: 'Error en el servidor al registrar proveedor' });
    }
};

export const vincularProveedor = async (req: any, res: Response): Promise<void> => {
    try {
        const { id_producto, id_proveedor, precio_compra } = req.body;
        const idUsuarioReal = req.headers['x-user-id'];

        const pool = await getConnection();
        const idRelacion = `rel-${uuidv4().substring(0,8)}`;
        const idAuditoria = `aud-${uuidv4().substring(0,8)}`;
        const valoresNuevos = JSON.stringify({ id_producto, id_proveedor, precio_compra });

        await pool.request()
            .input('id_relacion', idRelacion)
            .input('id_producto', id_producto)
            .input('id_proveedor', id_proveedor)
            .input('precio_compra', precio_compra)
            .input('id_usuario', idUsuarioReal)
            .input('id_auditoria', idAuditoria)
            .input('valores_nuevos', valoresNuevos)
            .input('ip_origen', req.ip || '127.0.0.1')
            .query(`
                BEGIN TRANSACTION;
                
                -- Insertamos en tu tabla intermedia producto_proveedor
                INSERT INTO dbo.producto_proveedor (id_relacion, id_producto, id_proveedor, precio_compra)
                VALUES (@id_relacion, @id_producto, @id_proveedor, @precio_compra);

                -- Evidencia forense de a qué precio estamos comprando
                INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                VALUES (@id_auditoria, @id_usuario, 'producto_proveedor', @id_relacion, 'INSERT', @valores_nuevos, @ip_origen);
                
                COMMIT TRANSACTION;
            `);

        res.status(201).json({ success: true, message: 'Proveedor vinculado al producto correctamente.' });
    } catch (error) {
        logger.error('Error vinculando proveedor', error);
        res.status(500).json({ error: 'Fallo al vincular el proveedor' });
    }
};
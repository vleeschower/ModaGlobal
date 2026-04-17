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
                -- Obtenemos el total de productos para la paginación
                DECLARE @TotalRecords INT = (SELECT COUNT(*) FROM dbo.productos WHERE deleted_at IS NULL);

                -- Hacemos un LEFT JOIN para traer el nombre de la categoría
                SELECT 
                    p.id_producto, 
                    p.nombre, 
                    p.descripcion, 
                    p.precio_base, 
                    p.imagen_url, 
                    p.id_categoria,
                    c.nombre AS nombre_categoria -- Aquí está la magia del JOIN
                FROM dbo.productos p
                LEFT JOIN dbo.categorias c ON p.id_categoria = c.id_categoria
                WHERE p.deleted_at IS NULL
                ORDER BY p.created_at DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

                -- Devolvemos el total
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

// 1. OBTENER DETALLE COMPLETO (Producto + Imágenes + Specs + Rating)
export const obtenerProductoPorId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        
        const result = await pool.request()
            .input('id', id)
            .query(`
                SELECT 
                    p.id_producto, p.nombre, p.descripcion, p.precio_base, p.sku, p.imagen_url as imagen_principal,
                    c.nombre AS nombre_categoria,
                    
                    -- Subconsulta: Galería de Imágenes
                    (SELECT imagen_url, es_principal, orden 
                     FROM dbo.imagenes_producto 
                     WHERE id_producto = p.id_producto AND deleted_at IS NULL 
                     ORDER BY orden 
                     FOR JSON PATH) AS galeria,
                     
                    -- Subconsulta: Especificaciones Técnicas
                    (SELECT clave, valor 
                     FROM dbo.especificaciones_producto 
                     WHERE id_producto = p.id_producto AND deleted_at IS NULL 
                     ORDER BY orden 
                     FOR JSON PATH) AS especificaciones,
                     
                    -- Subconsulta: Resumen de Calificaciones
                    (SELECT COUNT(*) as total, ISNULL(AVG(CAST(calificacion AS DECIMAL(3,2))), 0) as promedio
                     FROM dbo.resenas_producto 
                     WHERE id_producto = p.id_producto AND deleted_at IS NULL
                     FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS rating,
                     
                    -- Subconsulta: Últimas 5 reseñas (Usando TOP 5, sin FETCH)
                    (SELECT TOP 5 id_resena, id_usuario, calificacion, comentario, created_at 
                     FROM dbo.resenas_producto 
                     WHERE id_producto = p.id_producto AND deleted_at IS NULL
                     ORDER BY created_at DESC 
                     FOR JSON PATH) AS reseñas_recientes

                FROM dbo.productos p
                LEFT JOIN dbo.categorias c ON p.id_categoria = c.id_categoria
                WHERE p.id_producto = @id AND p.deleted_at IS NULL
            `);

        if (result.recordset.length === 0) {
            res.status(404).json({ success: false, message: 'Producto no encontrado.' });
            return;
        }

        // Parseo de los campos JSON que SQL Server devuelve como string
        const p = result.recordset[0];
        const dataFinal = {
            ...p,
            galeria: JSON.parse(p.galeria || '[]'),
            especificaciones: JSON.parse(p.especificaciones || '[]'),
            rating: JSON.parse(p.rating || '{"total":0, "promedio":0}'),
            reseñas_recientes: JSON.parse(p.reseñas_recientes || '[]')
        };

        res.status(200).json({ success: true, data: dataFinal });
    } catch (error) {
        logger.error('Error en obtenerProductoPorId:', error);
        res.status(500).json({ error: 'Error interno al obtener detalles' });
    }
};

// POST: Protegido (Solo Admins y SuperAdmins)
export const crearProducto = async (req: any, res: Response): Promise<void> => {
    // 1. Extraemos JWT Headers (El API Gateway los inyecta)
    const idUsuario = req.headers['x-user-id'] || 'ADMIN';
    const idTienda = req.headers['x-user-tienda-id'] || req.body.id_tienda || 'tnd-general';

    const pool = await getConnection();
    const transaction = pool.transaction();

    try {
        const { nombre, descripcion, precio_base, sku, id_categoria, stock_inicial } = req.body;
        
        // 2. Parseamos especificaciones (llegan como texto JSON en el FormData)
        let especificaciones: { clave: string, valor: string }[] = [];
        if (req.body.especificaciones) {
            try { especificaciones = JSON.parse(req.body.especificaciones); } catch(e) {}
        }

        // 3. Obtenemos las imágenes (Multer las procesa como un arreglo)
        const imagenes = req.files as Express.Multer.File[] || [];
        const imagenPrincipalUrl = imagenes.length > 0 ? imagenes[0].path : null;

        // Sanitización y conversiones
        const nombreLimpio = xss(nombre);
        const descLimpia = xss(descripcion);
        const precioNum = parseFloat(precio_base) || 0;
        const stockNum = parseInt(stock_inicial) || 0;

        const idProducto = `prod-${uuidv4().substring(0,8)}`;
        const idAuditoria = `aud-${uuidv4().substring(0,8)}`;

        // === INICIA TRANSACCIÓN SQL ===
        await transaction.begin();

        // A. Insertar Producto Básico
        const reqProducto = transaction.request();
        await reqProducto
            .input('id_producto', idProducto)
            .input('nombre', nombreLimpio)
            .input('descripcion', descLimpia)
            .input('id_categoria', id_categoria || null)
            .input('precio_base', precioNum)
            .input('sku', sku || null)
            .input('imagen_url', imagenPrincipalUrl)
            .input('id_usuario', idUsuario)
            .query(`
                INSERT INTO dbo.productos (id_producto, nombre, descripcion, id_categoria, precio_base, sku, imagen_url, created_by)
                VALUES (@id_producto, @nombre, @descripcion, @id_categoria, @precio_base, @sku, @imagen_url, @id_usuario);
            `);

        // B. Insertar Especificaciones (Bucle)
        for (let i = 0; i < especificaciones.length; i++) {
            const spec = especificaciones[i];
            if (spec.clave && spec.valor) {
                const reqSpec = transaction.request();
                await reqSpec
                    .input('id_espec', `spc-${uuidv4().substring(0,8)}`)
                    .input('id_prod', idProducto)
                    .input('clave', xss(spec.clave))
                    .input('valor', xss(spec.valor))
                    .input('orden', i + 1)
                    .input('id_user', idUsuario)
                    .query(`
                        INSERT INTO dbo.especificaciones_producto (id_especificacion, id_producto, clave, valor, orden, created_by)
                        VALUES (@id_espec, @id_prod, @clave, @valor, @orden, @id_user);
                    `);
            }
        }

        // C. Insertar Imágenes en Galería (Bucle)
        for (let i = 0; i < imagenes.length; i++) {
            const img = imagenes[i];
            const reqImg = transaction.request();
            await reqImg
                .input('id_img', `img-${uuidv4().substring(0,8)}`)
                .input('id_prod', idProducto)
                .input('img_url', img.path)
                .input('es_princ', i === 0 ? 1 : 0) // La foto 0 es la principal
                .input('orden', i + 1)
                .input('id_user', idUsuario)
                .query(`
                    INSERT INTO dbo.imagenes_producto (id_imagen, id_producto, imagen_url, es_principal, orden, created_by)
                    VALUES (@id_img, @id_prod, @img_url, @es_princ, @orden, @id_user);
                `);
        }

        // D. Auditoría Global
        const reqAuditoria = transaction.request();
        await reqAuditoria
            .input('id_aud', idAuditoria)
            .input('id_user', idUsuario)
            .input('id_reg', idProducto)
            .input('ip', req.ip || '127.0.0.1')
            .input('valores', JSON.stringify({ nombre: nombreLimpio, precio: precioNum, specs: especificaciones.length, fotos: imagenes.length }))
            .query(`
                INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                VALUES (@id_aud, @id_user, 'productos', @id_reg, 'INSERT_COMPLETO', @valores, @ip);
            `);

        // === CONFIRMAR TRANSACCIÓN ===
        await transaction.commit();

        // 4. Publicar Evento a Inventarios
        await publicarEvento('PRODUCTO_CREADO', {
            id_producto: idProducto,
            nombre: nombreLimpio,
            stock_inicial: stockNum,
            precio_base: precioNum,
            id_tienda: idTienda 
        });

        logger.info(`[ÉXITO] Producto ${idProducto} creado con especificaciones y fotos.`);
        res.status(201).json({ success: true, message: 'Producto registrado en ModaGlobal.', data: { id_producto: idProducto } });

    } catch (error) {
        // Si algo falla, deshacemos todo lo que se insertó
        await transaction.rollback();
        logger.error('Error creando producto maestro (Rollback ejecutado)', error);
        res.status(500).json({ error: 'Fallo al procesar la alta del producto' });
    }
};

// ==========================================
// MÓDULO: ACTUALIZAR PRODUCTO (PUT)
// ==========================================
export const actualizarProducto = async (req: any, res: Response): Promise<void> => {
    const { id } = req.params;
    const idUsuario = req.headers['x-user-id'] || 'ADMIN';

    const pool = await getConnection();
    const transaction = pool.transaction();

    try {
        const { nombre, descripcion, precio_base, sku, id_categoria } = req.body;
        
        // Parseamos especificaciones
        let especificaciones: { clave: string, valor: string }[] = [];
        if (req.body.especificaciones) {
            try { especificaciones = JSON.parse(req.body.especificaciones); } catch(e) {}
        }

        // Imágenes
        const imagenes = req.files as Express.Multer.File[] || [];
        const traeNuevasImagenes = imagenes.length > 0;
        const imagenPrincipalUrl = traeNuevasImagenes ? imagenes[0].path : null;

        // Sanitización
        const nombreLimpio = xss(nombre);
        const descLimpia = xss(descripcion);
        const precioNum = parseFloat(precio_base) || 0;
        const idAuditoria = `aud-${uuidv4().substring(0,8)}`;

        await transaction.begin();

        // A. Actualizar Producto Básico
        const reqProducto = transaction.request();
        let queryUpdateProd = `
            UPDATE dbo.productos 
            SET nombre = @nombre, descripcion = @descripcion, id_categoria = @id_categoria, 
                precio_base = @precio_base, sku = @sku, updated_at = SYSUTCDATETIME(), updated_by = @id_usuario
        `;
        
        // Solo sobrescribimos la URL de la imagen principal si subieron fotos nuevas
        if (traeNuevasImagenes) {
            queryUpdateProd += `, imagen_url = @imagen_url `;
            reqProducto.input('imagen_url', imagenPrincipalUrl);
        }
        queryUpdateProd += ` WHERE id_producto = @id_producto AND deleted_at IS NULL;`;

        await reqProducto
            .input('id_producto', id)
            .input('nombre', nombreLimpio)
            .input('descripcion', descLimpia)
            .input('id_categoria', id_categoria || null)
            .input('precio_base', precioNum)
            .input('sku', sku || null)
            .input('id_usuario', idUsuario)
            .query(queryUpdateProd);

        // B. Actualizar Especificaciones (Estrategia: Borrar viejas -> Insertar nuevas)
        const reqBorrarSpecs = transaction.request();
        await reqBorrarSpecs
            .input('id_prod', id)
            .input('id_user', idUsuario)
            .query(`
                UPDATE dbo.especificaciones_producto 
                SET deleted_at = SYSUTCDATETIME(), deleted_by = @id_user 
                WHERE id_producto = @id_prod AND deleted_at IS NULL;
            `);

        for (let i = 0; i < especificaciones.length; i++) {
            const spec = especificaciones[i];
            if (spec.clave && spec.valor) {
                const reqSpec = transaction.request();
                await reqSpec
                    .input('id_espec', `spc-${uuidv4().substring(0,8)}`)
                    .input('id_prod', id)
                    .input('clave', xss(spec.clave))
                    .input('valor', xss(spec.valor))
                    .input('orden', i + 1)
                    .input('id_user', idUsuario)
                    .query(`
                        INSERT INTO dbo.especificaciones_producto (id_especificacion, id_producto, clave, valor, orden, created_by)
                        VALUES (@id_espec, @id_prod, @clave, @valor, @orden, @id_user);
                    `);
            }
        }

        // C. Actualizar Imágenes (Solo si traen nuevas. Si no, dejamos las que estaban)
        if (traeNuevasImagenes) {
            const reqBorrarImg = transaction.request();
            await reqBorrarImg
                .input('id_prod', id)
                .input('id_user', idUsuario)
                .query(`
                    UPDATE dbo.imagenes_producto 
                    SET deleted_at = SYSUTCDATETIME(), deleted_by = @id_user 
                    WHERE id_producto = @id_prod AND deleted_at IS NULL;
                `);

            for (let i = 0; i < imagenes.length; i++) {
                const img = imagenes[i];
                const reqImg = transaction.request();
                await reqImg
                    .input('id_img', `img-${uuidv4().substring(0,8)}`)
                    .input('id_prod', id)
                    .input('img_url', img.path)
                    .input('es_princ', i === 0 ? 1 : 0) 
                    .input('orden', i + 1)
                    .input('id_user', idUsuario)
                    .query(`
                        INSERT INTO dbo.imagenes_producto (id_imagen, id_producto, imagen_url, es_principal, orden, created_by)
                        VALUES (@id_img, @id_prod, @img_url, @es_princ, @orden, @id_user);
                    `);
            }
        }

        // D. Auditoría Global
        const reqAuditoria = transaction.request();
        await reqAuditoria
            .input('id_aud', idAuditoria)
            .input('id_user', idUsuario)
            .input('id_reg', id)
            .input('ip', req.ip || '127.0.0.1')
            .input('valores', JSON.stringify({ nombre: nombreLimpio, precio: precioNum, specs: especificaciones.length, imagenesActualizadas: traeNuevasImagenes }))
            .query(`
                INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                VALUES (@id_aud, @id_user, 'productos', @id_reg, 'UPDATE_COMPLETO', @valores, @ip);
            `);

        await transaction.commit();
        logger.info(`[ÉXITO] Producto ${id} actualizado exitosamente.`);
        res.status(200).json({ success: true, message: 'Producto actualizado correctamente.' });

    } catch (error) {
        await transaction.rollback();
        logger.error(`Error actualizando producto ${id} (Rollback ejecutado)`, error);
        res.status(500).json({ error: 'Fallo al procesar la actualización del producto' });
    }
};

// ==========================================
// MÓDULO: ELIMINAR PRODUCTO (SOFT DELETE)
// ==========================================
export const eliminarProducto = async (req: any, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const idUsuario = req.headers['x-user-id'] || 'ADMIN';
        const pool = await getConnection();

        // 1. Borrado lógico (Soft Delete)
        await pool.request()
            .input('id_producto', id)
            .input('id_usuario', idUsuario)
            .query(`
                UPDATE dbo.productos 
                SET deleted_at = SYSUTCDATETIME(), deleted_by = @id_usuario 
                WHERE id_producto = @id_producto AND deleted_at IS NULL;
            `);

        // 2. Registro en Auditoría
        const idAuditoria = `aud-${uuidv4().substring(0,8)}`;
        await pool.request()
            .input('id_auditoria', idAuditoria)
            .input('id_usuario', idUsuario)
            .input('id_producto', id)
            .input('ip_origen', req.ip || '127.0.0.1')
            .query(`
                INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                VALUES (@id_auditoria, @id_usuario, 'productos', @id_producto, 'SOFT_DELETE', '{}', @ip_origen);
            `);

        res.status(200).json({ success: true, message: 'Producto eliminado correctamente.' });
    } catch (error) {
        logger.error(`Error eliminando producto ${req.params.id}:`, error);
        res.status(500).json({ error: 'No se pudo eliminar el producto.' });
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

// 2. INSERTAR RESEÑA (Con Auditoría y Sanitización)
export const crearResena = async (req: any, res: Response): Promise<void> => {
    try {
        const { id_producto, calificacion, comentario } = req.body;
        const idUsuario = req.headers['x-user-id'] || 'ANONIMO'; 
        
        // SEGURIDAD: Sanitización Anti-XSS
        const comentarioLimpio = xss(comentario);
        const idResena = `rev-${uuidv4().substring(0,8)}`;
        const idAuditoria = `aud-${uuidv4().substring(0,8)}`;

        const pool = await getConnection();
        
        // CORRECCIÓN: Nombres de variables idénticos entre Node y SQL
        await pool.request()
            .input('id_resena', idResena)
            .input('id_producto', id_producto)
            .input('id_usuario', idUsuario)
            .input('calificacion', calificacion)
            .input('comentario', comentarioLimpio)
            .input('id_auditoria', idAuditoria)
            .input('ip_origen', req.ip || '127.0.0.1')
            .input('valores_nuevos', JSON.stringify({ id_producto, calificacion, comentario: comentarioLimpio }))
            .query(`
                BEGIN TRANSACTION;
                
                -- 1. Insertar Reseña
                INSERT INTO dbo.resenas_producto (id_resena, id_producto, id_usuario, calificacion, comentario)
                VALUES (@id_resena, @id_producto, @id_usuario, @calificacion, @comentario);

                -- 2. Registro Forense
                INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                VALUES (@id_auditoria, @id_usuario, 'resenas_producto', @id_resena, 'INSERT_REVIEW', @valores_nuevos, @ip_origen);
                
                COMMIT TRANSACTION;
            `);

        res.status(201).json({ success: true, message: 'Reseña publicada con éxito' });
    } catch (error) {
        logger.error('Error al crear reseña:', error);
        res.status(500).json({ error: 'No se pudo procesar tu reseña' });
    }
};

// 3. OBTENER TODAS LAS RESEÑAS (Paginadas)
export const obtenerResenas = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;

        const pool = await getConnection();
        const result = await pool.request()
            .input('id_prod', id)
            .input('offset', offset)
            .input('limit', limit)
            .query(`
                SELECT id_resena, id_usuario, calificacion, comentario, created_at
                FROM dbo.resenas_producto
                WHERE id_producto = @id_prod AND deleted_at IS NULL
                ORDER BY created_at DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
            `);

        res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener reseñas' });
    }
};


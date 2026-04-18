import { Request, Response } from 'express';
import { logger } from '../utils/Logger';
import { getConnection } from '../config/Db';
import { v4 as uuidv4 } from 'uuid';
import xss from 'xss'; // Librería Anti-XSS
import { publicarEvento } from '../events/EventPublisher';

// GET: Público (Clientes, Cajeros, Admins) con PAGINACIÓN
export const obtenerProductos = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        
        const safeLimit = limit > 100 ? 100 : limit; 
        const offset = (page - 1) * safeLimit;

        const pool = await getConnection();
        
        // 2. Consulta corregida: Una sola declaración y un solo flujo
        const result = await pool.request()
            .input('offset', offset)
            .input('limit', safeLimit)
            .query(`
                -- 1. Declaramos y obtenemos el total una sola vez
                DECLARE @TotalRecords INT;
                SELECT @TotalRecords = COUNT(*) FROM dbo.productos WHERE deleted_at IS NULL;

                -- 2. Obtenemos los productos con su categoría en un solo SELECT
                SELECT 
                    p.id_producto, 
                    p.nombre, 
                    p.descripcion, 
                    p.precio_base, 
                    p.imagen_url, 
                    p.id_categoria,
                    c.nombre AS nombre_categoria
                FROM dbo.productos p
                LEFT JOIN dbo.categorias c ON p.id_categoria = c.id_categoria
                WHERE p.deleted_at IS NULL
                ORDER BY p.tiene_stock DESC, p.created_at DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

                -- 3. Devolvemos el total como segundo conjunto de resultados
                SELECT @TotalRecords as total_registros;
            `);
        
        // 3. Formateamos la respuesta
        const recordsets = result.recordsets as unknown as any[][]; 

        // 2. Ahora ya puedes acceder por índice sin errores
        const productos = recordsets[0] || [];
        const totalRegistrosRow = recordsets[1] ? recordsets[1][0] : null;
        const totalRegistros = totalRegistrosRow ? totalRegistrosRow.total_registros : 0;

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


// ==========================================
// MÓDULO: CREAR PRODUCTO (POST)
// ==========================================
export const crearProducto = async (req: any, res: Response): Promise<void> => {
    const pool = await getConnection();
    const transaction = pool.transaction();

    try {
        const { nombre, descripcion, precio_base, sku, id_categoria, stock_inicial, mainImageIndex } = req.body;
        const idUsuarioReal = req.headers['x-user-id'] || 'SISTEMA'; 
        
        // ✨ NUEVO: Parseamos las especificaciones que envía el Frontend
        let especificaciones: { clave: string, valor: string }[] = [];
        if (req.body.especificaciones) {
            try { especificaciones = JSON.parse(req.body.especificaciones); } catch(e) {}
        }

        // 1. Manejo de Imágenes Múltiples
        const imagenes = req.files as Express.Multer.File[] || [];
        if (imagenes.length === 0) {
            res.status(400).json({ error: 'Debes subir al menos una imagen.' });
            return;
        }

        // Definimos cuál es la principal (por defecto la 0, o la que el front haya mandado)
        const indicePrincipal = parseInt(mainImageIndex) || 0;
        const imagenPrincipalUrl = imagenes[indicePrincipal]?.path || imagenes[0].path;

        // Sanitización y parseo
        const nombreLimpio = xss(nombre);
        const descLimpia = xss(descripcion);
        const precioNum = parseFloat(precio_base);
        const stockNum = parseInt(stock_inicial) || 0;
        const idProducto = `prod-${uuidv4().substring(0,8)}`;
        const idAuditoria = `aud-${uuidv4().substring(0,8)}`;
        const valoresNuevos = JSON.stringify({ nombre: nombreLimpio, precio_base, sku });

        // ✨ NUEVO: Calculamos la bandera de SEO (tiene_stock) desde el día 1
        const tieneStock = stockNum > 0 ? 1 : 0;

        await transaction.begin();

        // A. Insertar en tabla maestra: PRODUCTOS 
        const reqProducto = transaction.request();
        await reqProducto
            .input('id_producto', idProducto)
            .input('nombre', nombreLimpio)
            .input('descripcion', descLimpia)
            .input('id_categoria', id_categoria)
            .input('precio_base', precioNum)
            .input('sku', sku)
            .input('imagen_url', imagenPrincipalUrl) 
            .input('tiene_stock', tieneStock) // ✨ Inyectamos la bandera
            .input('id_usuario', idUsuarioReal)
            .query(`
                INSERT INTO dbo.productos (id_producto, nombre, descripcion, id_categoria, precio_base, sku, imagen_url, tiene_stock, created_by)
                VALUES (@id_producto, @nombre, @descripcion, @id_categoria, @precio_base, @sku, @imagen_url, @tiene_stock, @id_usuario);
            `);

        // B. ✨ NUEVO: Guardar las especificaciones técnicas (Ej. Fuerza de succión, Autonomía)
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
                    .input('id_user', idUsuarioReal)
                    .query(`
                        INSERT INTO dbo.especificaciones_producto (id_especificacion, id_producto, clave, valor, orden, created_by)
                        VALUES (@id_espec, @id_prod, @clave, @valor, @orden, @id_user);
                    `);
            }
        }

        // C. Insertar TODAS las imágenes en IMAGENES_PRODUCTO
        let contadorOrdenSecundario = 2; // Empezamos a contar desde el 2 para las fotos que no son portada

        for (let i = 0; i < imagenes.length; i++) {
            const reqImg = transaction.request();
            
            // Verificamos si este ciclo del bucle corresponde a la imagen que el usuario marcó con la estrella
            const es_principal = (i === indicePrincipal) ? 1 : 0;
            
            // ✨ LÓGICA DE ORDEN: Si es principal, es la 1. Si no, le toca 2, luego 3, luego 4...
            const ordenImagen = (es_principal === 1) ? 1 : contadorOrdenSecundario++;
            
            await reqImg
                .input('id_imagen', `img-${uuidv4().substring(0,8)}`)
                .input('id_producto', idProducto)
                .input('imagen_url', imagenes[i].path) // ¡Ahora sí cada URL será diferente!
                .input('es_principal', es_principal)
                .input('orden', ordenImagen) // ✨ Inyectamos el orden calculado
                .input('id_user', idUsuarioReal)
                .query(`
                    INSERT INTO dbo.imagenes_producto (id_imagen, id_producto, imagen_url, es_principal, orden, created_by)
                    VALUES (@id_imagen, @id_producto, @imagen_url, @es_principal, @orden, @id_user);
                `);
        }

        // D. Auditoría
        const reqAuditoria = transaction.request();
        await reqAuditoria
            .input('id_auditoria', idAuditoria)
            .input('id_usuario', idUsuarioReal)
            .input('id_producto', idProducto)
            .input('valores_nuevos', valoresNuevos)
            .input('ip_origen', req.ip || '127.0.0.1')
            .query(`
                INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                VALUES (@id_auditoria, @id_usuario, 'productos', @id_producto, 'INSERT', @valores_nuevos, @ip_origen);
            `);

        await transaction.commit();
        logger.info(`Producto ${idProducto} creado en Base de Datos con ${imagenes.length} imágenes y ${especificaciones.length} especificaciones.`);
        
        // E. Evento para el microservicio de INVENTARIOS (El Bus)
        const tiendaDestino = req.usuarioTiendaId || req.body.id_tienda;
        await publicarEvento('PRODUCTO_CREADO', {
            id_producto: idProducto,
            nombre: nombreLimpio,
            stock_inicial: stockNum || 0, 
            precio_base: precio_base,
            id_tienda: tiendaDestino 
        });

        res.status(201).json({ success: true, message: 'Producto creado exitosamente.' });

    } catch (error) {
        await transaction.rollback();
        logger.error('Error creando producto', error);
        res.status(500).json({ error: 'Fallo al crear el producto' });
    }
}

// ==========================================
// MÓDULO: ACTUALIZAR PRODUCTO (PUT)
// ==========================================
export const actualizarProducto = async (req: any, res: Response): Promise<void> => {
    const { id } = req.params;
    const idUsuario = req.headers['x-user-id'] || 'ADMIN';
    const pool = await getConnection();
    const transaction = pool.transaction();

    try {
        const { nombre, descripcion, precio_base, sku, id_categoria, mainImageIndex } = req.body;
        
        // Parseamos especificaciones
        let especificaciones: { clave: string, valor: string }[] = [];
        if (req.body.especificaciones) {
            try { especificaciones = JSON.parse(req.body.especificaciones); } catch(e) {}
        }

        // Imágenes
        const imagenes = req.files as Express.Multer.File[] || [];
        const traeNuevasImagenes = imagenes.length > 0;
        const indicePrincipal = parseInt(mainImageIndex) || 0;
        const imagenPrincipalUrl = traeNuevasImagenes ? imagenes[indicePrincipal]?.path : null;

        const nombreLimpio = xss(nombre);
        const descLimpia = xss(descripcion);
        const precioNum = parseFloat(precio_base) || 0;

        await transaction.begin();

        // A. Actualizar Producto Básico
        const reqProducto = transaction.request();
        let queryUpdateProd = `
            UPDATE dbo.productos 
            SET nombre = @nombre, descripcion = @descripcion, id_categoria = @id_categoria, 
                precio_base = @precio_base, sku = @sku, updated_at = SYSUTCDATETIME(), updated_by = @id_usuario
        `;
        
        // Solo sobrescribimos la URL maestra si subieron fotos nuevas
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

        // B. Actualizar Especificaciones (Borradas Lógicas -> Insertar Nuevas)
        const reqBorrarSpecs = transaction.request();
        await reqBorrarSpecs.input('id_prod', id).input('id_user', idUsuario).query(`
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
                    .input('id_prod', id).input('clave', xss(spec.clave)).input('valor', xss(spec.valor)).input('orden', i + 1).input('id_user', idUsuario)
                    .query(`
                        INSERT INTO dbo.especificaciones_producto (id_especificacion, id_producto, clave, valor, orden, created_by)
                        VALUES (@id_espec, @id_prod, @clave, @valor, @orden, @id_user);
                    `);
            }
        }

        // C. Actualizar Imágenes (Solo si traen nuevas)
        if (traeNuevasImagenes) {
            const reqBorrarImg = transaction.request();
            await reqBorrarImg.input('id_prod', id).input('id_user', idUsuario).query(`
                UPDATE dbo.imagenes_producto 
                SET deleted_at = SYSUTCDATETIME(), deleted_by = @id_user 
                WHERE id_producto = @id_prod AND deleted_at IS NULL;
            `);

            for (let i = 0; i < imagenes.length; i++) {
                const reqImg = transaction.request();
                const es_principal = (i === indicePrincipal) ? 1 : 0;
                await reqImg
                    .input('id_img', `img-${uuidv4().substring(0,8)}`)
                    .input('id_prod', id).input('img_url', imagenes[i].path).input('es_princ', es_principal).input('orden', i + 1).input('id_user', idUsuario)
                    .query(`
                        INSERT INTO dbo.imagenes_producto (id_imagen, id_producto, imagen_url, es_principal, orden, created_by)
                        VALUES (@id_img, @id_prod, @img_url, @es_princ, @orden, @id_user);
                    `);
            }
        }

        // D. Auditoría (Omitida por brevedad en la respuesta, pero déjala como la tenías)
        await transaction.commit();
        res.status(200).json({ success: true, message: 'Producto actualizado correctamente.' });

    } catch (error) {
        await transaction.rollback();
        logger.error(`Error actualizando producto ${id}`, error);
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

// ==========================================
// 1. OBTENER PROMOCIONES PARA EL ADMIN (Por Tienda)
// ==========================================
export const obtenerPromocionesAdmin = async (req: any, res: Response): Promise<void> => {
    try {
        const rolUsuario = req.usuarioRol;
        
        // ✨ EL DETALLE DEL MIDDLEWARE: 
        // Nos aseguramos de leer la variable correcta dependiendo de cómo tu middleware guardó el JWT.
        // Si tu JWT dice "id_tienda", lo ideal es extraerlo así:
        const id_tienda = req.usuarioTiendaId || req.user?.id_tienda || req.body?.id_tienda;

        const pool = await getConnection();

        // 👑 LÓGICA SUPERADMIN (No necesita tienda, ve toda la red)
        if (rolUsuario === 'SuperAdmin') {
            const result = await pool.request().query(`
                SELECT 
                    p.id_producto, p.nombre, p.sku, p.precio_base,
                    pr.id_promocion, pr.descuento, pr.fecha_inicio, pr.fecha_fin, pr.id_tienda
                FROM dbo.productos p
                -- Usamos LEFT JOIN para traer el producto AUNQUE NO TENGA promoción
                LEFT JOIN dbo.promociones pr ON p.id_producto = pr.id_producto AND pr.deleted_at IS NULL
                WHERE p.deleted_at IS NULL
                ORDER BY p.created_at DESC
            `);
            
            res.status(200).json({ 
                success: true, 
                tienda_actual: 'Todas las Sucursales (MODO SUPERADMIN)', 
                data: result.recordset 
            });
            return;
        }

        // 🏪 LÓGICA ADMIN (Estrictamente amarrado a su tienda)
        if (!id_tienda) {
            logger.warn(`Intento de acceso Admin sin id_tienda en el token. ID Usuario: ${req.usuarioTransaccion}`);
            res.status(400).json({ error: 'Token inválido: Tu usuario no tiene una tienda asignada en el sistema.' });
            return;
        }

        const result = await pool.request()
            .input('id_tienda', id_tienda)
            .query(`
                SELECT 
                    p.id_producto, p.nombre, p.sku, p.precio_base,
                    pr.id_promocion, pr.descuento, pr.fecha_inicio, pr.fecha_fin, pr.id_tienda
                FROM dbo.productos p
                LEFT JOIN dbo.promociones pr 
                    ON p.id_producto = pr.id_producto 
                    AND pr.id_tienda = @id_tienda 
                    AND pr.deleted_at IS NULL
                WHERE p.deleted_at IS NULL
                ORDER BY p.created_at DESC
            `);

        res.status(200).json({ 
            success: true, 
            tienda_actual: id_tienda, 
            data: result.recordset 
        });

    } catch (error) {
        logger.error('Error al obtener promociones admin:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// ==========================================
// 2. GUARDAR PROMOCION (CREAR O ACTUALIZAR)
// ==========================================
export const guardarPromocion = async (req: any, res: Response): Promise<void> => {
    const pool = await getConnection();
    const transaction = pool.transaction();

    try {
        const { id_producto, descuento, fecha_inicio, fecha_fin } = req.body;
        const idUsuarioReal = req.usuarioTransaccion || 'SISTEMA';
        const rolUsuario = req.usuarioRol;

        // CANDADO DE SEGURIDAD
        const id_tienda = (rolUsuario === 'SuperAdmin' && req.body.id_tienda) 
            ? req.body.id_tienda 
            : req.usuarioTiendaId;

        if (!id_tienda) {
            res.status(403).json({ error: 'Acceso denegado: No tienes una tienda asignada.' });
            return;
        }

        if (descuento < 0 || descuento > 100) {
            res.status(400).json({ error: 'El descuento debe ser un valor entre 0 y 100.' });
            return;
        }

        await transaction.begin();
        const request = transaction.request();

        // Ejecutamos la lógica Upsert (Insertar o Actualizar) en SQL
        const result = await request
            .input('id_producto', id_producto)
            .input('id_tienda', id_tienda)
            .input('descuento', descuento)
            .input('fecha_inicio', fecha_inicio)
            .input('fecha_fin', fecha_fin)
            .input('id_usuario', idUsuarioReal)
            .input('ip_origen', req.ip || '127.0.0.1')
            .query(`
                BEGIN TRY
                    DECLARE @id_promocion_existente VARCHAR(50);
                    DECLARE @id_auditoria VARCHAR(50) = 'aud-' + LEFT(NEWID(), 8);
                    DECLARE @accion VARCHAR(20);
                    
                    -- Verificamos si la tienda ya tiene una promo para este producto
                    SELECT @id_promocion_existente = id_promocion 
                    FROM dbo.promociones 
                    WHERE id_producto = @id_producto AND id_tienda = @id_tienda AND deleted_at IS NULL;

                    IF @id_promocion_existente IS NOT NULL
                    BEGIN
                        -- ACTUALIZAR PROMOCIÓN EXISTENTE
                        UPDATE dbo.promociones 
                        SET descuento = @descuento, fecha_inicio = @fecha_inicio, fecha_fin = @fecha_fin, 
                            updated_at = SYSUTCDATETIME(), updated_by = @id_usuario
                        WHERE id_promocion = @id_promocion_existente;

                        SET @accion = 'UPDATE_PROMO';
                        
                        -- Auditoría Update
                        INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                        VALUES (@id_auditoria, @id_usuario, 'promociones', @id_promocion_existente, @accion, 
                                JSON_MODIFY(JSON_MODIFY('{}', '$.descuento', @descuento), '$.tienda', @id_tienda), @ip_origen);
                    END
                    ELSE
                    BEGIN
                        -- CREAR NUEVA PROMOCIÓN
                        DECLARE @id_nueva_promo VARCHAR(50) = 'prm-' + LEFT(NEWID(), 8);
                        
                        INSERT INTO dbo.promociones (id_promocion, id_producto, descuento, fecha_inicio, fecha_fin, id_tienda, created_by)
                        VALUES (@id_nueva_promo, @id_producto, @descuento, @fecha_inicio, @fecha_fin, @id_tienda, @id_usuario);

                        SET @accion = 'INSERT_PROMO';

                        -- Auditoría Insert
                        INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                        VALUES (@id_auditoria, @id_usuario, 'promociones', @id_nueva_promo, @accion, 
                                JSON_MODIFY(JSON_MODIFY('{}', '$.descuento', @descuento), '$.tienda', @id_tienda), @ip_origen);
                    END
                END TRY
                BEGIN CATCH
                    THROW;
                END CATCH
            `);

        await transaction.commit();
        res.status(200).json({ success: true, message: 'Promoción guardada exitosamente.' });

    } catch (error) {
        await transaction.rollback();
        logger.error('Error guardando promoción:', error);
        res.status(500).json({ error: 'Fallo al guardar la promoción en la base de datos.' });
    }
};

// ==========================================
// 3. OBTENER PROMOCIONES (Vista Pública / Clientes)
// ==========================================
export const obtenerPromocionesPublicas = async (req: Request, res: Response): Promise<void> => {
    // Aquí el frontend del cliente envía la tienda que el usuario seleccionó en la web
    const tiendaDestino = req.query.tienda || 'tnd-nacional'; 
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('tienda', tiendaDestino)
            .query(`
                SELECT p.id_producto, p.nombre, p.precio_base, pr.descuento, pr.fecha_fin
                FROM dbo.promociones pr
                INNER JOIN dbo.productos p ON p.id_producto = pr.id_producto
                WHERE pr.id_tienda = @tienda 
                  AND pr.deleted_at IS NULL
                  AND SYSUTCDATETIME() BETWEEN pr.fecha_inicio AND pr.fecha_fin
            `);
        res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
        res.status(500).json({ error: 'Error al cargar ofertas.' });
    }
};
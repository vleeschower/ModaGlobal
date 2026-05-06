import { Request, Response } from 'express';
import { logger } from '../utils/Logger';
import { getConnection } from '../config/Db';
import { v4 as uuidv4 } from 'uuid';
import xss from 'xss'; // Librería Anti-XSS
import { publicarEvento } from '../events/EventPublisher';

// ============================================================================
// GET: Público (Clientes y Navegantes) con LÓGICA DE TIENDA CERCANA (OMNICANAL)
// ============================================================================
export const obtenerProductos = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const tiendaCercana = req.headers['x-tienda-cercana'] as string || req.query.tienda as string || 'tnd-matriz';

        const safeLimit = limit > 100 ? 100 : limit; 
        const offset = (page - 1) * safeLimit;

        const pool = await getConnection();
        
        const result = await pool.request()
            .input('offset', offset)
            .input('limit', safeLimit)
            .input('tienda', tiendaCercana)
            .query(`
                DECLARE @TotalRecords INT;
                SELECT @TotalRecords = COUNT(*) FROM dbo.productos WHERE deleted_at IS NULL;

                SELECT 
                    p.id_producto, 
                    p.nombre, 
                    p.descripcion, 
                    p.precio_base, 
                    p.imagen_url, -- ✨ OPTIMIZADO: Lee directo de la tabla de productos
                    p.id_categoria,
                    c.nombre AS nombre_categoria,
                    ISNULL(ir.stock_disponible, 0) as stock_local,
                    pr.descuento as descuento_local,
                    pr.fecha_fin as promo_fin
                FROM dbo.productos p
                LEFT JOIN dbo.categorias c ON p.id_categoria = c.id_categoria
                LEFT JOIN dbo.inventarios_replica ir ON p.id_producto = ir.id_producto AND ir.id_tienda = @tienda
                LEFT JOIN dbo.promociones pr ON p.id_producto = pr.id_producto 
                     AND pr.id_tienda = @tienda 
                     AND pr.deleted_at IS NULL 
                     AND SYSUTCDATETIME() BETWEEN pr.fecha_inicio AND pr.fecha_fin
                WHERE p.deleted_at IS NULL
                ORDER BY p.created_at DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

                SELECT @TotalRecords as total_registros;
            `);
        
        const recordsets = result.recordsets as unknown as any[][]; 
        const productos = recordsets[0] || [];
        const totalRegistrosRow = recordsets[1] ? recordsets[1][0] : null;
        const totalRegistros = totalRegistrosRow ? totalRegistrosRow.total_registros : 0;

        res.status(200).json({ 
            success: true, 
            tienda_referencia: tiendaCercana,
            meta: {
                pagina_actual: page,
                productos_por_pagina: safeLimit,
                total_productos: totalRegistros,
                total_paginas: Math.ceil(totalRegistros / safeLimit)
            },
            data: productos 
        });

    } catch (error) {
        logger.error('Error obteniendo catálogo público omnicanal', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ==========================================
// POST: CREAR PRODUCTO (Solo Admins)
// ==========================================
export const crearProducto = async (req: any, res: Response): Promise<void> => {
    const pool = await getConnection();
    const transaction = pool.transaction();

    try {
        const { nombre, descripcion, precio_base, sku, id_categoria, stock_inicial, mainImageIndex } = req.body;
        const idUsuarioReal = req.headers['x-user-id'] || 'SISTEMA'; 
        const tiendaDestino = 'tnd-matriz';

        const imagenesSubidas = req.files as Express.Multer.File[] || [];
        if (imagenesSubidas.length === 0) {
            res.status(400).json({ error: 'La imagen del producto es obligatoria.' });
            return;
        }

        let especificaciones: { clave: string, valor: string }[] = [];
        if (req.body.especificaciones) {
            try { especificaciones = JSON.parse(req.body.especificaciones); } catch(e) {}
        }

        const precioNum = parseFloat(precio_base);
        const stockNum = parseInt(stock_inicial) || 0;
        const indicePrincipal = parseInt(mainImageIndex) || 0;

        const nombreLimpio = xss(nombre);
        const descLimpia = xss(descripcion);

        const idProducto = `prod-${uuidv4().substring(0,8)}`;
        const idAuditoria = `aud-${uuidv4().substring(0,8)}`;
        const imagenUrlSegura = imagenesSubidas[indicePrincipal]?.path || imagenesSubidas[0].path; 

        await transaction.begin();

        // 1. INSERTAR PRODUCTO BÁSICO
        const reqProd = transaction.request();
        await reqProd
            .input('id_producto', idProducto)
            .input('nombre', nombreLimpio)
            .input('descripcion', descLimpia)
            .input('id_categoria', id_categoria || null)
            .input('precio_base', precioNum)
            .input('sku', sku)
            .input('imagen_url', imagenUrlSegura) 
            .input('id_usuario', idUsuarioReal)
            .query(`
                INSERT INTO dbo.productos (id_producto, nombre, descripcion, id_categoria, precio_base, sku, imagen_url, created_by)
                VALUES (@id_producto, @nombre, @descripcion, @id_categoria, @precio_base, @sku, @imagen_url, @id_usuario);
            `);

        // 2. INSERTAR ESPECIFICACIONES
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

        // 3. INSERTAR GALERÍA CON ORDEN INTELIGENTE
        let contadorSecundarias = 2;

        for (let i = 0; i < imagenesSubidas.length; i++) {
            const img = imagenesSubidas[i];
            const esPrincipalBit = (i === indicePrincipal) ? 1 : 0;
            const ordenImagen = (esPrincipalBit === 1) ? 1 : contadorSecundarias++;

            const reqImg = transaction.request();
            await reqImg
                .input('id_img', `img-${uuidv4().substring(0,8)}`)
                .input('id_prod', idProducto)
                .input('img_url', img.path)
                .input('es_princ', esPrincipalBit)
                .input('orden', ordenImagen)
                .input('id_user', idUsuarioReal)
                .query(`
                    INSERT INTO dbo.imagenes_producto (id_imagen, id_producto, imagen_url, es_principal, orden, created_by)
                    VALUES (@id_img, @id_prod, @img_url, @es_princ, @orden, @id_user);
                `);
        }

        // 4. AUDITORÍA
        const reqAud = transaction.request();
        await reqAud
            .input('id_auditoria', idAuditoria)
            .input('id_usuario', idUsuarioReal)
            .input('id_producto', idProducto)
            .input('ip_origen', req.ip || '127.0.0.1')
            .input('valores_nuevos', JSON.stringify({ nombre: nombreLimpio, precio_base, sku }))
            .query(`
                INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                VALUES (@id_auditoria, @id_usuario, 'productos', @id_producto, 'INSERT_COMPLETO', @valores_nuevos, @ip_origen);
            `);

        await transaction.commit();
        logger.info(`Producto ${idProducto} creado con su galería y especificaciones.`);
        
        await publicarEvento('PRODUCTO_CREADO', {
            id_producto: idProducto,
            nombre: nombreLimpio,
            stock_inicial: stockNum || 0,
            precio_base: precio_base,
            id_tienda: tiendaDestino 
        });

        res.status(201).json({ success: true, message: 'Producto creado y propagado en la red.' });

    } catch (error) {
        await transaction.rollback();
        logger.error('Error creando producto', error);
        res.status(500).json({ error: 'Fallo al crear el producto' });
    }       
};

// ==========================================
// 1. OBTENER DETALLE COMPLETO DEL PRODUCTO
// ==========================================
export const obtenerProductoPorId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const tiendaCercana = req.headers['x-tienda-cercana'] as string || req.query.tienda as string || 'tnd-matriz';

        const pool = await getConnection();
        
        const result = await pool.request()
            .input('id', id)
            .input('tienda', tiendaCercana)
            .query(`
                SELECT 
                    p.id_producto, p.nombre, p.descripcion, p.precio_base, p.sku, p.imagen_url,
                    c.nombre AS nombre_categoria,
                    ISNULL(ir.stock_disponible, 0) as stock_local,
                    pr.descuento as descuento_local,
                    pr.fecha_fin as promo_fin,
                    
                    -- Galería de Imágenes (La fuente real de las fotos para el grid)
                    (SELECT id_imagen, imagen_url, es_principal, orden 
                     FROM dbo.imagenes_producto 
                     WHERE id_producto = p.id_producto AND deleted_at IS NULL 
                     ORDER BY orden 
                     FOR JSON PATH) AS galeria,
                     
                    (SELECT clave, valor 
                     FROM dbo.especificaciones_producto 
                     WHERE id_producto = p.id_producto AND deleted_at IS NULL 
                     ORDER BY orden 
                     FOR JSON PATH) AS especificaciones,
                     
                    (SELECT COUNT(*) as total, ISNULL(AVG(CAST(calificacion AS DECIMAL(3,2))), 0) as promedio
                     FROM dbo.resenas_producto 
                     WHERE id_producto = p.id_producto AND deleted_at IS NULL
                     FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS rating,
                     
                    (SELECT TOP 5 id_resena, id_usuario, nombre_usuario_snapshot, calificacion, comentario, created_at 
                     FROM dbo.resenas_producto 
                     WHERE id_producto = p.id_producto AND deleted_at IS NULL
                     ORDER BY created_at DESC 
                     FOR JSON PATH) AS reseñas_recientes,

                     NULL AS razon_agotado

                FROM dbo.productos p
                LEFT JOIN dbo.categorias c ON p.id_categoria = c.id_categoria
                LEFT JOIN dbo.inventarios_replica ir ON p.id_producto = ir.id_producto AND ir.id_tienda = @tienda
                LEFT JOIN dbo.promociones pr ON p.id_producto = pr.id_producto AND pr.id_tienda = @tienda AND pr.deleted_at IS NULL AND SYSUTCDATETIME() BETWEEN pr.fecha_inicio AND pr.fecha_fin
                
                WHERE p.id_producto = @id AND p.deleted_at IS NULL
            `);

        if (result.recordset.length === 0) {
            res.status(404).json({ success: false, message: 'Producto no encontrado.' });
            return;
        }

        const p = result.recordset[0];
        const dataFinal = {
            ...p,
            galeria: JSON.parse(p.galeria || '[]'),
            especificaciones: JSON.parse(p.especificaciones || '[]'),
            rating: JSON.parse(p.rating || '{"total":0, "promedio":0}'),
            reseñas_recientes: JSON.parse(p.reseñas_recientes || '[]')
        };

        res.status(200).json({ success: true, tienda_referencia: tiendaCercana, data: dataFinal });
    } catch (error) {
        logger.error('Error en obtenerProductoPorId:', error);
        res.status(500).json({ error: 'Error interno al obtener detalles' });
    }
};

// ==========================================
// MÓDULO: ACTUALIZAR PRODUCTO (PUT) - 🛡️ BLINDADO 🛡️
// ==========================================
export const actualizarProducto = async (req: any, res: Response): Promise<void> => {
    const { id } = req.params;
    const idUsuario = req.headers['x-user-id'] || 'ADMIN';

    const pool = await getConnection();
    const transaction = pool.transaction();

    try {
        const { nombre, descripcion, precio_base, sku, id_categoria, mainImageId, mainImageIndex, imagesToDelete: rawImagesToDelete } = req.body;
        
        let especificaciones: { clave: string, valor: string }[] = [];
        if (req.body.especificaciones) {
            try { especificaciones = JSON.parse(req.body.especificaciones); } catch(e) {}
        }

        let imagesToDelete: string[] = [];
        if (rawImagesToDelete) {
            try { imagesToDelete = JSON.parse(rawImagesToDelete); } catch(e) {}
        }

        const imagenesNuevas = req.files as Express.Multer.File[] || [];
        const nombreLimpio = xss(nombre);
        const descLimpia = xss(descripcion);
        const precioNum = parseFloat(precio_base) || 0;

        await transaction.begin();

        // 1. ACTUALIZAR PRODUCTO BÁSICO
        const reqProducto = transaction.request();
        await reqProducto
            .input('id_producto', id)
            .input('nombre', nombreLimpio)
            .input('descripcion', descLimpia)
            .input('id_categoria', id_categoria || null)
            .input('precio_base', precioNum)
            .input('sku', sku || null)
            .input('id_usuario', idUsuario)
            .query(`
                UPDATE dbo.productos 
                SET nombre = @nombre, descripcion = @descripcion, id_categoria = @id_categoria, 
                    precio_base = @precio_base, sku = @sku, updated_at = SYSUTCDATETIME(), updated_by = @id_usuario
                WHERE id_producto = @id_producto AND deleted_at IS NULL;
            `);

        // 2. ACTUALIZAR ESPECIFICACIONES
        const reqBorrarSpecs = transaction.request();
        await reqBorrarSpecs.input('id_prod', id).input('id_user', idUsuario).query(`
            UPDATE dbo.especificaciones_producto SET deleted_at = SYSUTCDATETIME(), deleted_by = @id_user 
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

        // 3. GALERÍA - VALIDACIONES Y BORRADO
        if (imagesToDelete.length > 0) {
            const reqCheckImages = transaction.request(); 
            const resCheck = await reqCheckImages.input('id_prod', id).query(`
                SELECT 
                    (SELECT COUNT(*) FROM dbo.imagenes_producto WHERE id_producto = @id_prod AND deleted_at IS NULL) as total_activas,
                    (SELECT TOP 1 id_imagen FROM dbo.imagenes_producto WHERE id_producto = @id_prod AND es_principal = 1 AND deleted_at IS NULL) as current_main
            `);

            const imagenesActuales = resCheck.recordset[0].total_activas;
            const currentMainId = resCheck.recordset[0].current_main;
            const totalFinalEstimado = imagenesActuales - imagesToDelete.length + imagenesNuevas.length;

            // Validación A: No dejar el producto sin fotos
            if (totalFinalEstimado <= 0) {
                await transaction.rollback(); 
                res.status(400).json({ error: 'El producto no puede quedarse sin imágenes. Sube al menos una foto nueva antes de eliminar las actuales.' });
                return;
            }

            // ✨ VALIDACIÓN B: Si borra la principal, DEBE asignar otra obligatoriamente
            if (currentMainId && imagesToDelete.includes(currentMainId)) {
                const isAssigningNewMain = mainImageIndex !== undefined && mainImageIndex !== null && parseInt(mainImageIndex) >= 0;
                const isAssigningExistingValidMain = mainImageId && mainImageId !== 'null' && mainImageId !== 'undefined' && !imagesToDelete.includes(mainImageId);

                if (!isAssigningNewMain && !isAssigningExistingValidMain) {
                    await transaction.rollback(); 
                    res.status(400).json({ error: 'Debes cambiar de imagen de portada antes de eliminar esta imagen.' });
                    return;
                }
            }
            
            // Si pasó las validaciones, procedemos a borrar
            const placeholders = imagesToDelete.map((_, i) => `@delImg${i}`).join(',');
            const reqDel = transaction.request();
            reqDel.input('id_user', idUsuario);
            imagesToDelete.forEach((id_img, i) => reqDel.input(`delImg${i}`, id_img));
            
            await reqDel.query(`
                UPDATE dbo.imagenes_producto SET deleted_at = SYSUTCDATETIME(), deleted_by = @id_user 
                WHERE id_imagen IN (${placeholders}) AND deleted_at IS NULL;
            `);
        }

        // 4. GALERÍA - INSERTAR NUEVAS FOTOS
        const reqMaxOrden = transaction.request();
        reqMaxOrden.input('id_prod', id);
        const resultOrden = await reqMaxOrden.query(`
            SELECT ISNULL(MAX(orden), 0) as max_orden 
            FROM dbo.imagenes_producto 
            WHERE id_producto = @id_prod AND deleted_at IS NULL;
        `);
        let nextOrden = resultOrden.recordset[0].max_orden + 1;

        let idPrincipalNuevo = null;
        let urlPrincipalNuevo = null;

        for (let i = 0; i < imagenesNuevas.length; i++) {
            const img = imagenesNuevas[i];
            const newImgId = `img-${uuidv4().substring(0,8)}`;
            if (parseInt(mainImageIndex) === i) { 
                idPrincipalNuevo = newImgId; 
                urlPrincipalNuevo = img.path; 
            }

            const reqImg = transaction.request();
            await reqImg
                .input('id_img', newImgId)
                .input('id_prod', id)
                .input('img_url', img.path)
                .input('es_princ', 0) 
                .input('orden', nextOrden++) 
                .input('id_user', idUsuario)
                .query(`
                    INSERT INTO dbo.imagenes_producto (id_imagen, id_producto, imagen_url, es_principal, orden, created_by)
                    VALUES (@id_img, @id_prod, @img_url, @es_princ, @orden, @id_user);
                `);
        }

        // 5. ✨ SINCRONIZACIÓN MAESTRA DE LA IMAGEN PRINCIPAL ✨
        const reqMainImg = transaction.request();
        await reqMainImg.input('id_prod', id).query(`
            -- Apagamos todas las estrellas temporalmente
            UPDATE dbo.imagenes_producto SET es_principal = 0 WHERE id_producto = @id_prod;
        `);

        if (mainImageId && mainImageId !== 'null' && mainImageId !== 'undefined' && mainImageId !== '') {
            reqMainImg.input('main_id', mainImageId);
            await reqMainImg.query(`
                UPDATE dbo.imagenes_producto SET es_principal = 1, orden = 1 WHERE id_imagen = @main_id;
                -- Copiamos a la tabla de productos
                UPDATE dbo.productos SET imagen_url = (SELECT imagen_url FROM dbo.imagenes_producto WHERE id_imagen = @main_id) WHERE id_producto = @id_prod;
            `);
        } else if (idPrincipalNuevo) {
            reqMainImg.input('first_new_id', idPrincipalNuevo);
            reqMainImg.input('first_new_url', urlPrincipalNuevo);
            await reqMainImg.query(`
                UPDATE dbo.imagenes_producto SET es_principal = 1, orden = 1 WHERE id_imagen = @first_new_id;
                -- Copiamos a la tabla de productos
                UPDATE dbo.productos SET imagen_url = @first_new_url WHERE id_producto = @id_prod;
            `);
        } else {
            // FAILSAFE: Si por error no se mandó una principal, agarramos la primera que exista y la volvemos principal
            await reqMainImg.query(`
                DECLARE @FailsafeId VARCHAR(50);
                DECLARE @FailsafeUrl VARCHAR(500);

                SELECT TOP 1 @FailsafeId = id_imagen, @FailsafeUrl = imagen_url 
                FROM dbo.imagenes_producto 
                WHERE id_producto = @id_prod AND deleted_at IS NULL 
                ORDER BY orden ASC, created_at ASC;

                IF @FailsafeId IS NOT NULL
                BEGIN
                    UPDATE dbo.imagenes_producto SET es_principal = 1, orden = 1 WHERE id_imagen = @FailsafeId;
                    UPDATE dbo.productos SET imagen_url = @FailsafeUrl WHERE id_producto = @id_prod;
                END
            `);
        }

        // 5.5 REORGANIZACIÓN DINÁMICA DEL CARRUSEL
        const reqReorden = transaction.request();
        await reqReorden.input('id_prod', id).query(`
            WITH CarruselOrdenado AS (
                SELECT id_imagen, orden, es_principal,
                    ROW_NUMBER() OVER(ORDER BY es_principal DESC, created_at ASC) as nuevo_orden
                FROM dbo.imagenes_producto
                WHERE id_producto = @id_prod AND deleted_at IS NULL
            )
            UPDATE CarruselOrdenado SET orden = nuevo_orden;
        `);

        // 6. AUDITORÍA GLOBAL
        const reqAuditoria = transaction.request();
        await reqAuditoria
            .input('id_aud', `aud-${uuidv4().substring(0,8)}`)
            .input('id_user', idUsuario)
            .input('id_reg', id)
            .input('ip', req.ip || '127.0.0.1')
            .input('valores', JSON.stringify({ nombre: nombreLimpio, precio: precioNum }))
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
        const idAuditoria = `aud-${uuidv4().substring(0,8)}`;

        await pool.request()
            .input('id_producto', id)
            .input('id_usuario', idUsuario)
            .input('id_auditoria', idAuditoria)
            .input('ip_origen', req.ip || '127.0.0.1')
            .query(`
                BEGIN TRANSACTION;

                UPDATE dbo.productos 
                SET deleted_at = SYSUTCDATETIME(), deleted_by = @id_usuario 
                WHERE id_producto = @id_producto AND deleted_at IS NULL;

                INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                VALUES (@id_auditoria, @id_usuario, 'productos', @id_producto, 'SOFT_DELETE', '{}', @ip_origen);

                COMMIT TRANSACTION;
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
// MÓDULO: PROVEEDORES (Relación Muchos a Muchos)
// ==========================================
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
        const rawUserName = req.headers['x-user-name'] as string;
        const nombre_usuario = rawUserName ? decodeURIComponent(rawUserName) : '';
        
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
            .input('nombre_usuario_snapshot', nombre_usuario)
            .input('calificacion', calificacion)
            .input('comentario', comentarioLimpio)
            .input('id_auditoria', idAuditoria)
            .input('ip_origen', req.ip || '127.0.0.1')
            .input('valores_nuevos', JSON.stringify({ id_producto, calificacion, comentario: comentarioLimpio }))
            .query(`
                BEGIN TRANSACTION;
                
                -- 1. Insertar Reseña
                INSERT INTO dbo.resenas_producto (id_resena, id_producto, id_usuario, nombre_usuario_snapshot, calificacion, comentario)
                VALUES (@id_resena, @id_producto, @id_usuario, @nombre_usuario_snapshot, @calificacion, @comentario);

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
                SELECT id_resena, id_usuario, nombre_usuario_snapshot, calificacion, comentario, created_at
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
        const id_tienda = req.usuarioTiendaId;

        // ✨ NUEVO: Captura de parámetros de paginación y búsqueda
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const safeLimit = limit > 100 ? 100 : limit; 
        const offset = (page - 1) * safeLimit;
        
        const searchParam = req.query.search ? req.query.search.toString() : null;
        const sortParam = req.query.sort ? req.query.sort.toString() : 'newest';

        const pool = await getConnection();

        let queryStr = '';

        // 👑 LÓGICA SUPERADMIN
        if (rolUsuario === 'SuperAdministrador') {
            queryStr = `
                DECLARE @TotalRecords INT = (
                    SELECT COUNT(*) FROM dbo.productos p
                    WHERE p.deleted_at IS NULL
                    AND (@search IS NULL OR p.nombre LIKE '%' + @search + '%' OR p.sku LIKE '%' + @search + '%')
                );

                SELECT 
                    p.id_producto, p.nombre, p.sku, p.precio_base,
                    pr.id_promocion, pr.descuento, pr.fecha_inicio, pr.fecha_fin, pr.id_tienda
                FROM dbo.productos p
                LEFT JOIN dbo.promociones pr ON p.id_producto = pr.id_producto AND pr.deleted_at IS NULL
                WHERE p.deleted_at IS NULL
                AND (@search IS NULL OR p.nombre LIKE '%' + @search + '%' OR p.sku LIKE '%' + @search + '%')
                ORDER BY 
                    CASE WHEN @sort = 'az' THEN p.nombre END ASC,
                    CASE WHEN @sort = 'za' THEN p.nombre END DESC,
                    CASE WHEN @sort = 'newest' THEN p.created_at END DESC,
                    p.created_at DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

                SELECT @TotalRecords as total_registros;
            `;
        } 
        // 🏪 LÓGICA ADMIN
        else {
            if (!id_tienda) {
                res.status(400).json({ error: 'Token inválido: Tu usuario no tiene una tienda asignada en el sistema.' });
                return;
            }
            queryStr = `
                DECLARE @TotalRecords INT = (
                    SELECT COUNT(*) FROM dbo.productos p
                    WHERE p.deleted_at IS NULL
                    AND (@search IS NULL OR p.nombre LIKE '%' + @search + '%' OR p.sku LIKE '%' + @search + '%')
                );

                SELECT 
                    p.id_producto, p.nombre, p.sku, p.precio_base,
                    pr.id_promocion, pr.descuento, pr.fecha_inicio, pr.fecha_fin, pr.id_tienda
                FROM dbo.productos p
                LEFT JOIN dbo.promociones pr 
                    ON p.id_producto = pr.id_producto 
                    AND pr.id_tienda = @id_tienda 
                    AND pr.deleted_at IS NULL
                WHERE p.deleted_at IS NULL
                AND (@search IS NULL OR p.nombre LIKE '%' + @search + '%' OR p.sku LIKE '%' + @search + '%')
                ORDER BY 
                    CASE WHEN @sort = 'az' THEN p.nombre END ASC,
                    CASE WHEN @sort = 'za' THEN p.nombre END DESC,
                    CASE WHEN @sort = 'newest' THEN p.created_at END DESC,
                    p.created_at DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

                SELECT @TotalRecords as total_registros;
            `;
        }

        const result = await pool.request()
            .input('id_tienda', id_tienda)
            .input('offset', offset)
            .input('limit', safeLimit)
            .input('search', searchParam)
            .input('sort', sortParam)
            .query(queryStr);

        const recordsets = result.recordsets as any[]; 
        const totalRegistros = recordsets[1][0].total_registros;

        res.status(200).json({ 
            success: true, 
            tienda_actual: rolUsuario === 'SuperAdministrador' ? 'Todas las Sucursales (MODO SUPERADMIN)' : id_tienda, 
            meta: {
                pagina_actual: page,
                productos_por_pagina: safeLimit,
                total_productos: totalRegistros,
                total_paginas: Math.ceil(totalRegistros / safeLimit)
            },
            data: recordsets[0]
        });

    } catch (error) {
        logger.error('Error al obtener promociones admin:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

export const guardarPromocion = async (req: any, res: Response): Promise<void> => {
    const pool = await getConnection();
    const transaction = pool.transaction();

    try {
        const { id_producto, descuento, fecha_inicio, fecha_fin } = req.body;
        const idUsuarioReal = req.usuarioTransaccion || 'SISTEMA';
        const rolUsuario = req.usuarioRol;

        // CANDADO DE SEGURIDAD
        const id_tienda = (rolUsuario === 'SuperAdministrador' && req.body.id_tienda) 
            ? req.body.id_tienda 
            : req.usuarioTiendaId;

        if (!id_tienda) {
            res.status(403).json({ error: 'Acceso denegado: No tienes una tienda asignada.' });
            return;
        }

        // VALIDACIONES OBLIGATORIAS
        if (!fecha_inicio || !fecha_fin) {
            res.status(400).json({ error: 'Ambas fechas (inicio y fin) son obligatorias.' });
            return;
        }
        if (descuento <= 0 || descuento > 100) {
            res.status(400).json({ error: 'El descuento debe ser mayor a 0 y menor a 100.' });
            return;
        }

        // ✨ LA SOLUCIÓN: Convertimos el texto del Frontend a Objetos Date de Node.js
        const dateInicio = new Date(fecha_inicio);
        const dateFin = new Date(fecha_fin);

        // Verificamos que las fechas sean reales y válidas
        if (isNaN(dateInicio.getTime()) || isNaN(dateFin.getTime())) {
            res.status(400).json({ error: 'Las fechas proporcionadas no tienen un formato válido.' });
            return;
        }

        await transaction.begin();
        const request = transaction.request();

        // Guardamos las fechas estandarizadas en formato ISO para la auditoría JSON
        const valoresNuevos = JSON.stringify({ 
            descuento, 
            tienda: id_tienda, 
            fecha_inicio: dateInicio.toISOString(), 
            fecha_fin: dateFin.toISOString() 
        });

        // Ejecutamos la lógica Upsert
        await request
            .input('id_producto', id_producto)
            .input('id_tienda', id_tienda)
            .input('descuento', descuento)
            .input('fecha_inicio', dateInicio) // <-- 🌟 Pasamos el objeto Date directamente (mssql hace la magia)
            .input('fecha_fin', dateFin)       // <-- 🌟 Pasamos el objeto Date directamente
            .input('id_usuario', idUsuarioReal)
            .input('ip_origen', req.ip || '127.0.0.1')
            .input('valores_nuevos', valoresNuevos)
            .query(`
                BEGIN TRY
                    DECLARE @id_promocion_existente VARCHAR(50);
                    DECLARE @id_auditoria VARCHAR(50) = 'aud-' + LEFT(NEWID(), 8);
                    DECLARE @accion VARCHAR(20);
                    
                    SELECT @id_promocion_existente = id_promocion 
                    FROM dbo.promociones WITH (UPDLOCK)
                    WHERE id_producto = @id_producto AND id_tienda = @id_tienda AND deleted_at IS NULL;

                    IF @id_promocion_existente IS NOT NULL
                    BEGIN
                        -- ACTUALIZAR
                        UPDATE dbo.promociones 
                        SET descuento = @descuento, fecha_inicio = @fecha_inicio, fecha_fin = @fecha_fin, 
                            updated_at = SYSUTCDATETIME(), updated_by = @id_usuario
                        WHERE id_promocion = @id_promocion_existente;

                        SET @accion = 'UPDATE_PROMO';
                        
                        INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                        VALUES (@id_auditoria, @id_usuario, 'promociones', @id_promocion_existente, @accion, @valores_nuevos, @ip_origen);
                    END
                    ELSE
                    BEGIN
                        -- CREAR
                        DECLARE @id_nueva_promo VARCHAR(50) = 'prm-' + LEFT(NEWID(), 8);
                        
                        INSERT INTO dbo.promociones (id_promocion, id_producto, descuento, fecha_inicio, fecha_fin, id_tienda, created_by)
                        VALUES (@id_nueva_promo, @id_producto, @descuento, @fecha_inicio, @fecha_fin, @id_tienda, @id_usuario);

                        SET @accion = 'INSERT_PROMO';

                        INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                        VALUES (@id_auditoria, @id_usuario, 'promociones', @id_nueva_promo, @accion, @valores_nuevos, @ip_origen);
                    END
                END TRY
                BEGIN CATCH
                    THROW;
                END CATCH
            `);

        await transaction.commit();
        res.status(200).json({ success: true, message: 'Promoción guardada exitosamente.' });

    } catch (error: any) {
        try {
            await transaction.rollback();
        } catch (rollbackError) {
            // Se ignora silenciosamente porque significa que SQL Server ya la había cancelado
        }
        
        logger.error('Error guardando promoción:', error);
        res.status(500).json({ error: error.message || 'Fallo interno al procesar la promoción en base de datos.' });
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

// ==========================================
// OBTENER PRODUCTOS PARA EL PANEL DE ADMIN (Con Búsqueda y Filtros)
// ==========================================
export const obtenerProductosAdmin = async (req: any, res: Response): Promise<void> => {
    try {
        const rolUsuario = req.usuarioRol;
        const id_tienda = req.usuarioTiendaId;
        
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const safeLimit = limit > 100 ? 100 : limit; 
        const offset = (page - 1) * safeLimit;
        
        const searchParam = req.query.search ? req.query.search.toString() : null;
        const sortParam = req.query.sort ? req.query.sort.toString() : 'newest';

        const pool = await getConnection();
        let queryStr = '';

        // 👑 LÓGICA SUPERADMIN
        if (rolUsuario === 'SuperAdministrador') {
            queryStr = `
                DECLARE @TotalRecords INT = (
                    SELECT COUNT(*) FROM dbo.productos 
                    WHERE deleted_at IS NULL
                    AND (@search IS NULL OR nombre LIKE '%' + @search + '%' OR sku LIKE '%' + @search + '%')
                );

                SELECT 
                    p.id_producto, p.nombre, p.sku, p.precio_base, c.nombre as categoria,
                    pr.descuento as descuento,
                    pr.fecha_inicio as promo_inicio, -- ✨ NUEVO: Agregamos la fecha de inicio
                    pr.fecha_fin as promo_fin
                FROM dbo.productos p
                LEFT JOIN dbo.categorias c ON p.id_categoria = c.id_categoria
                LEFT JOIN dbo.promociones pr ON p.id_producto = pr.id_producto AND pr.id_tienda = 'tnd-matriz' AND pr.deleted_at IS NULL AND SYSUTCDATETIME() BETWEEN pr.fecha_inicio AND pr.fecha_fin
                WHERE p.deleted_at IS NULL
                AND (@search IS NULL OR p.nombre LIKE '%' + @search + '%' OR p.sku LIKE '%' + @search + '%')
                ORDER BY 
                    CASE WHEN @sort = 'az' THEN p.nombre END ASC,
                    CASE WHEN @sort = 'za' THEN p.nombre END DESC,
                    CASE WHEN @sort = 'newest' THEN p.created_at END DESC,
                    p.created_at DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

                SELECT @TotalRecords as total_registros;
            `;
        } 
        // 🏪 LÓGICA ADMIN
        else {
            if (!id_tienda) {
                res.status(400).json({ error: 'Token inválido: Tu usuario no tiene una tienda asignada en el sistema.' });
                return;
            }
            queryStr = `
                DECLARE @TotalRecords INT = (
                    SELECT COUNT(*) FROM dbo.productos 
                    WHERE deleted_at IS NULL
                    AND (@search IS NULL OR nombre LIKE '%' + @search + '%' OR sku LIKE '%' + @search + '%')
                );

                SELECT 
                    p.id_producto, p.nombre, p.sku, p.precio_base, c.nombre as categoria,
                    ISNULL(ir.stock_disponible, 0) as stock_local,
                    pr.descuento as descuento,
                    pr.fecha_inicio as promo_inicio, -- ✨ NUEVO: Agregamos la fecha de inicio
                    pr.fecha_fin as promo_fin
                FROM dbo.productos p
                LEFT JOIN dbo.categorias c ON p.id_categoria = c.id_categoria
                LEFT JOIN dbo.inventarios_replica ir ON p.id_producto = ir.id_producto AND ir.id_tienda = @id_tienda
                LEFT JOIN dbo.promociones pr ON p.id_producto = pr.id_producto AND pr.id_tienda = @id_tienda AND pr.deleted_at IS NULL AND SYSUTCDATETIME() BETWEEN pr.fecha_inicio AND pr.fecha_fin
                WHERE p.deleted_at IS NULL
                AND (@search IS NULL OR p.nombre LIKE '%' + @search + '%' OR p.sku LIKE '%' + @search + '%')
                ORDER BY 
                    CASE WHEN @sort = 'az' THEN p.nombre END ASC,
                    CASE WHEN @sort = 'za' THEN p.nombre END DESC,
                    CASE WHEN @sort = 'newest' THEN p.created_at END DESC,
                    p.created_at DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

                SELECT @TotalRecords as total_registros;
            `;
        }

        const result = await pool.request()
            .input('id_tienda', id_tienda)
            .input('offset', offset)
            .input('limit', safeLimit)
            .input('search', searchParam)
            .input('sort', sortParam)
            .query(queryStr);

        const recordsets = result.recordsets as any[]; 
        const totalRegistros = recordsets[1][0].total_registros;

        res.status(200).json({ 
            success: true, 
            tienda_actual: rolUsuario === 'SuperAdministrador' ? 'Todas las Sucursales (MODO SUPERADMIN)' : id_tienda, 
            meta: {
                pagina_actual: page,
                productos_por_pagina: safeLimit,
                total_productos: totalRegistros,
                total_paginas: Math.ceil(totalRegistros / safeLimit)
            },
            data: recordsets[0]
        });

    } catch (error) {
        logger.error('Error al obtener promociones admin:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// ====================================================================================
// GET: Inventario en Red (Tabla cruzada: Matriz vs Local)
// ====================================================================================
export const obtenerInventarioRed = async (req: any, res: Response): Promise<void> => {
    try {
        const id_tienda = req.usuarioTiendaId;
        const ID_SEDE_CENTRAL = 'tnd-matriz';

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search ? req.query.search.toString() : null;
        const sortParam = req.query.sort ? req.query.sort.toString() : 'newest'; 
        const offset = (page - 1) * limit;

        const pool = await getConnection();
        const result = await pool.request()
            .input('id_tienda', id_tienda)
            .input('id_matriz', ID_SEDE_CENTRAL)
            .input('search', search)
            .input('sort', sortParam) 
            .input('limit', limit)
            .input('offset', offset)
            .query(`
                DECLARE @Total INT = (SELECT COUNT(*) FROM dbo.productos WHERE deleted_at IS NULL AND (@search IS NULL OR nombre LIKE '%' + @search + '%' OR sku LIKE '%' + @search + '%'));

                SELECT 
                    p.id_producto, p.sku, p.nombre, p.imagen_url, -- ✨ OPTIMIZADO
                    ISNULL(inv_local.stock_disponible, 0) as stock_local,
                    ISNULL(inv_matriz.stock_disponible, 0) as stock_matriz
                FROM dbo.productos p
                LEFT JOIN dbo.inventarios_replica inv_local ON p.id_producto = inv_local.id_producto AND inv_local.id_tienda = @id_tienda
                LEFT JOIN dbo.inventarios_replica inv_matriz ON p.id_producto = inv_matriz.id_producto AND inv_matriz.id_tienda = @id_matriz
                WHERE p.deleted_at IS NULL AND (@search IS NULL OR p.nombre LIKE '%' + @search + '%' OR p.sku LIKE '%' + @search + '%')
                ORDER BY 
                    CASE WHEN @sort = 'az' THEN p.nombre END ASC,
                    CASE WHEN @sort = 'za' THEN p.nombre END DESC,
                    CASE WHEN @sort = 'newest' THEN p.created_at END DESC,
                    p.created_at DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

                SELECT @Total as total;
            `);

        const recordsets = result.recordsets as unknown as any[][];
        const data = recordsets[0] || [];
        const total = (recordsets[1] && recordsets[1][0]) ? recordsets[1][0].total : 0;

        res.status(200).json({
            success: true,
            meta: { pagina_actual: page, total_paginas: Math.ceil(total / limit) },
            data
        });
    } catch (error) {
        logger.error('Error al cargar el inventario en red:', error);
        res.status(500).json({ error: 'Error al cargar el inventario en red' });
    }
};

// ====================================================================================
// OBTENER PRODUCTOS PARA EL CARRITO (Por Lista de IDs)
// ====================================================================================
export const obtenerProductosPorListaIds = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ids } = req.body;
        const tiendaCercana = req.headers['x-tienda-cercana'] as string || 'tnd-matriz';

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ error: "Se requiere un arreglo de IDs" });
            return;
        }

        const pool = await getConnection();
        const result = await pool.request()
            .input('tienda', tiendaCercana)
            .query(`
                SELECT 
                    p.id_producto, p.nombre, p.precio_base, p.imagen_url, -- ✨ OPTIMIZADO
                    ISNULL(ir.stock_disponible, 0) as stock_local,
                    pr.descuento as descuento_local
                FROM dbo.productos p
                LEFT JOIN dbo.inventarios_replica ir ON p.id_producto = ir.id_producto AND ir.id_tienda = @tienda
                LEFT JOIN dbo.promociones pr ON p.id_producto = pr.id_producto 
                    AND pr.id_tienda = @tienda 
                    AND pr.deleted_at IS NULL 
                    AND SYSUTCDATETIME() BETWEEN pr.fecha_inicio AND pr.fecha_fin
                WHERE p.id_producto IN (${ids.map((id: string) => `'${id}'`).join(',')})
                AND p.deleted_at IS NULL
            `);

        res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
        res.status(500).json({ error: "Error al hidratar productos del carrito" });
    }
};

// ====================================================================================
// 🔥 OBTENER MÚLTIPLES PRODUCTOS (Para VentasService)
// ====================================================================================
export const obtenerMultiplesProductos = async (req: Request, res: Response): Promise<void> => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ success: false, message: 'Faltan los IDs o el formato es incorrecto' });
            return;
        }

        const pool = await getConnection();
        const request = pool.request();

        const placeholders = ids.map((id, index) => {
            request.input(`id${index}`, id);
            return `@id${index}`;
        }).join(', ');

        const result = await request.query(`
            SELECT 
                p.id_producto, 
                p.nombre, 
                p.precio_base,
                p.imagen_url -- ✨ OPTIMIZADO
            FROM dbo.productos p 
            WHERE p.id_producto IN (${placeholders}) AND p.deleted_at IS NULL
        `);

        res.status(200).json(result.recordset);
    } catch (error) {
        logger.error('Error al obtener múltiples productos:', error);
        res.status(500).json({ success: false, message: 'Error al consultar productos' });
    }
};
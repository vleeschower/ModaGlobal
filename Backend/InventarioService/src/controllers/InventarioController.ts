import { Request, Response } from 'express';
import { logger } from '../utils/Logger';
import { getConnection } from '../config/Db';
import { v4 as uuidv4 } from 'uuid';
import xss from 'xss';
import { publicarEvento } from '../events/EventPublisher';

// Función utilitaria para crear pausas estratégicas en milisegundos
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// MÓDULO: TIENDAS / ALMACENES
// ==========================================
export const crearTienda = async (req: any, res: Response): Promise<void> => {
    try {
        const { nombre, region, direccion } = req.body;
        const idUsuarioReal = req.headers['x-user-id'] || 'SISTEMA';

        // 1. Sanitización Anti-XSS
        const nombreLimpio = xss(nombre);
        const regionLimpia = xss(region);
        const direccionLimpia = xss(direccion);

        const pool = await getConnection();
        const idTienda = `tnd-${uuidv4().substring(0,8)}`;
        const idAuditoria = `aud-${uuidv4().substring(0,8)}`;
        const valoresNuevos = JSON.stringify({ nombre: nombreLimpio, region: regionLimpia });

        // 2. Consulta Parametrizada
        await pool.request()
            .input('id_tienda', idTienda)
            .input('nombre', nombreLimpio)
            .input('region', regionLimpia)
            .input('direccion', direccionLimpia)
            .input('id_usuario', idUsuarioReal)
            .input('id_auditoria', idAuditoria)
            .input('valores_nuevos', valoresNuevos)
            .input('ip_origen', req.ip || '127.0.0.1')
            .query(`
                BEGIN TRANSACTION;
                
                INSERT INTO dbo.tiendas (id_tienda, nombre, region, direccion)
                VALUES (@id_tienda, @nombre, @region, @direccion);

                INSERT INTO dbo.auditoria_inventarios (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                VALUES (@id_auditoria, @id_usuario, 'tiendas', @id_tienda, 'INSERT', @valores_nuevos, @ip_origen);
                
                COMMIT TRANSACTION;
            `);

        res.status(201).json({ success: true, message: 'Tienda/Almacén creado exitosamente.', id_tienda: idTienda });
    } catch (error) {
        logger.error('Error creando tienda', error);
        res.status(500).json({ error: 'Fallo al registrar la tienda.' });
    }
};

// ==========================================
// MÓDULO: INVENTARIOS (Lectura)
// ==========================================
export const consultarStock = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id_producto } = req.params;
        const pool = await getConnection();
        
        // Hacemos un JOIN para que el frontend sepa el nombre de la tienda, no solo el ID
        const result = await pool.request()
            .input('id_producto', id_producto)
            .query(`
                SELECT i.id_inventario, i.id_tienda, t.nombre AS nombre_tienda, 
                       i.stock_disponible, i.stock_reservado
                FROM dbo.inventarios i
                INNER JOIN dbo.tiendas t ON i.id_tienda = t.id_tienda
                WHERE i.id_producto = @id_producto AND t.deleted_at IS NULL
            `);

        res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
        logger.error(`Error consultando stock del producto ${req.params.id_producto}`, error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ==========================================
// MÓDULO: MOVIMIENTOS (Ajuste de Stock Seguro)
// ==========================================
export const ajustarStock = async (req: any, res: Response): Promise<void> => {
    try {
        const { id_producto, cantidad, tipo_movimiento, id_referencia } = req.body;
        
        const idUsuarioReal = req.usuarioTransaccion; 
        const rolUsuario = req.usuarioRol;

        const id_tienda = (rolUsuario === 'Administrador' || rolUsuario === 'Cajero')
            ? req.usuarioTiendaId 
            : req.body.id_tienda;

        if (!id_tienda) {
            res.status(400).json({ error: 'Operación rechazada: No se ha especificado una tienda válida.' });
            return;
        }

        if (!['INGRESO', 'MERMA', 'TRASLADO', 'VENTA'].includes(tipo_movimiento)) {
             res.status(400).json({ error: 'Tipo de movimiento inválido.' });
             return;
        }

        const refLimpia = xss(id_referencia || 'AJUSTE_MANUAL');
        const pool = await getConnection();
        const idMovimiento = `mov-${uuidv4().substring(0,8)}`;

        // 👇 2. GUARDAMOS EL RESULTADO EN UNA VARIABLE
        const result = await pool.request()
            .input('id_movimiento', idMovimiento)
            .input('id_tienda', id_tienda)
            .input('id_producto', id_producto)
            .input('cantidad', cantidad) 
            .input('tipo_movimiento', tipo_movimiento)
            .input('id_referencia', refLimpia)
            .input('id_usuario', idUsuarioReal)
            .input('ip_origen', req.ip || '127.0.0.1') // ✨ NUEVO: Capturamos la IP
            .query(`
                BEGIN TRY
                    BEGIN TRANSACTION;

                    DECLARE @id_inventario VARCHAR(50);
                    DECLARE @stock_actual INT;
                    DECLARE @stock_reservado_actual INT = 0; 

                    SELECT @id_inventario = id_inventario, @stock_actual = stock_disponible, @stock_reservado_actual = stock_reservado
                    FROM dbo.inventarios WITH (UPDLOCK)
                    WHERE id_tienda = @id_tienda AND id_producto = @id_producto;

                    IF @id_inventario IS NULL
                    BEGIN
                        IF @cantidad < 0
                        BEGIN
                            THROW 50001, 'No hay stock. El producto nunca ha ingresado a esta tienda.', 1;
                        END

                        SET @id_inventario = 'inv-' + LEFT(NEWID(), 8);
                        INSERT INTO dbo.inventarios (id_inventario, id_tienda, id_producto, stock_disponible, stock_reservado)
                        VALUES (@id_inventario, @id_tienda, @id_producto, 0, 0);
                        
                        SET @stock_actual = 0;
                    END

                    IF (@stock_actual + @cantidad < 0)
                    BEGIN
                        THROW 50001, 'Stock insuficiente para procesar la salida/merma solicitada.', 1;
                    END

                    UPDATE dbo.inventarios 
                    SET stock_disponible = stock_disponible + @cantidad, updated_at = SYSUTCDATETIME()
                    WHERE id_inventario = @id_inventario;

                    INSERT INTO dbo.movimientos_inventario (id_movimiento, id_inventario, tipo_movimiento, cantidad, id_referencia, created_by)
                    VALUES (@id_movimiento, @id_inventario, @tipo_movimiento, @cantidad, @id_referencia, @id_usuario);

                    -- ✨ NUEVO: Registro forense en auditoría
                    DECLARE @id_auditoria VARCHAR(50) = 'aud-' + LEFT(NEWID(), 8);
                    INSERT INTO dbo.auditoria_inventarios (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                    VALUES (@id_auditoria, @id_usuario, 'inventarios', @id_inventario, @tipo_movimiento, JSON_MODIFY('{}', '$.cantidad_afectada', @cantidad), @ip_origen);

                    -- 👇 3. MAGIA: DEVOLVEMOS EL STOCK FINAL
                    SELECT 
                        @id_inventario AS id_inventario_final, 
                        (@stock_actual + @cantidad) AS stock_disponible_final,
                        @stock_reservado_actual AS stock_reservado_final;

                    COMMIT TRANSACTION;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0
                        ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            `);

        // 👇 4. PUBLICAMOS EL EVENTO CON LOS DATOS REALES DE SQL
        const datosFinales = result.recordset[0];

        await publicarEvento('STOCK_ACTUALIZADO', {
            id_inventario: datosFinales.id_inventario_final,
            id_tienda: id_tienda,
            id_producto: id_producto,
            stock_disponible: datosFinales.stock_disponible_final,
            stock_reservado: datosFinales.stock_reservado_final
        });

        res.status(200).json({ success: true, message: 'Inventario actualizado correctamente y evento propagado.' });

    } catch (error: any) {
        if (error.number === 50001) {
            logger.warn(`Validación de stock fallida: ${error.message}`);
            res.status(400).json({ error: error.message });
        } else {
            logger.error('Error ajustando stock', error);
            res.status(500).json({ error: 'Fallo al procesar el movimiento de inventario.' });
        }
    }
};

export const obtenerTiendas = async (req: any, res: Response): Promise<void> => {
    try {
        const pool = await getConnection();
        
        const result = await pool.request()
            .query(`
                SELECT id_tienda, nombre, region, direccion
                FROM dbo.tiendas
                WHERE deleted_at IS NULL
                ORDER BY nombre ASC
            `);

        res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
        logger.error('Error obteniendo tiendas', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// ==========================================
// MÓDULO: SOLICITUDES DE STOCK (WORKFLOW)
// ==========================================

// 1. Administrador solicita stock
export const solicitarStock = async (req: any, res: Response): Promise<void> => {
    try {
        const { id_producto, cantidad } = req.body;
        const id_tienda = req.usuarioTiendaId;
        const id_usuario = req.usuarioTransaccion;

        if (!id_tienda) {
            res.status(403).json({ error: 'Debes tener una tienda asignada para solicitar stock.' });
            return;
        }

        if (cantidad <= 0) {
            res.status(400).json({ error: 'La cantidad solicitada debe ser mayor a 0.' });
            return;
        }

        const pool = await getConnection();
        const idSolicitud = `req-${uuidv4().substring(0,8)}`;

        await pool.request()
            .input('id_solicitud', idSolicitud)
            .input('id_tienda', id_tienda)
            .input('id_producto', id_producto)
            .input('cantidad', cantidad)
            .input('id_usuario', id_usuario)
            .query(`
                INSERT INTO dbo.solicitudes_stock (id_solicitud, id_tienda, id_producto, cantidad, estado, id_usuario_solicita)
                VALUES (@id_solicitud, @id_tienda, @id_producto, @cantidad, 'PENDIENTE', @id_usuario);
            `);

        res.status(201).json({ success: true, message: 'Solicitud de stock enviada al Sede Central.' });
    } catch (error) {
        logger.error('Error solicitando stock:', error);
        res.status(500).json({ error: 'Fallo al procesar la solicitud de stock.' });
    }
};

// 2. Obtener solicitudes (SuperAdmin ve todas, Admin ve solo las suyas)
export const obtenerSolicitudes = async (req: any, res: Response): Promise<void> => {
    try {
        const rolUsuario = req.usuarioRol;
        const id_tienda = req.usuarioTiendaId;
        const pool = await getConnection();

        let query = `
            SELECT s.id_solicitud, s.id_tienda, t.nombre as nombre_tienda, s.id_producto, 
                   s.cantidad, s.estado, s.created_at
            FROM dbo.solicitudes_stock s
            INNER JOIN dbo.tiendas t ON s.id_tienda = t.id_tienda
        `;

        const request = pool.request();

        // Si es Administrador normal, filtramos por su tienda
        if (rolUsuario === 'Administrador') {
            query += ` WHERE s.id_tienda = @id_tienda `;
            request.input('id_tienda', id_tienda);
        }

        query += ` ORDER BY CASE WHEN s.estado = 'PENDIENTE' THEN 1 ELSE 2 END, s.created_at DESC`;

        const result = await request.query(query);
        res.status(200).json({ success: true, data: result.recordset });
    } catch (error) {
        logger.error('Error obteniendo solicitudes:', error);
        res.status(500).json({ error: 'Fallo al cargar las solicitudes.' });
    }
};

// 3. SuperAdministrador aprueba o rechaza
export const responderSolicitud = async (req: any, res: Response): Promise<void> => {
    try { // <-- ESTE ES EL TRY GENERAL (Para la Base de Datos)
        const { id_solicitud } = req.params;
        const { accion } = req.body; // 'APROBAR' o 'RECHAZAR'
        const id_usuario_responde = req.usuarioTransaccion;
        
        // ✨ DEFINIMOS EL ID DE LA SEDE CENTRAL
        const ID_SEDE_CENTRAL = 'tnd-matriz'; 

        if (!['APROBAR', 'RECHAZAR'].includes(accion)) {
            res.status(400).json({ error: 'Acción inválida. Use APROBAR o RECHAZAR.' });
            return;
        }

        const pool = await getConnection();
        
        // 1. Verificamos la solicitud
        const solResult = await pool.request()
            .input('id_solicitud', id_solicitud)
            .query(`SELECT * FROM dbo.solicitudes_stock WHERE id_solicitud = @id_solicitud AND estado = 'PENDIENTE'`);
            
        if (solResult.recordset.length === 0) {
            res.status(404).json({ error: 'Solicitud no encontrada o ya fue procesada.' });
            return;
        }

        const solicitud = solResult.recordset[0];
        const nuevoEstado = accion === 'APROBAR' ? 'APROBADA' : 'RECHAZADA';

        // 2. Transacción de Respuesta
        const request = pool.request();
        request.input('id_sol', id_solicitud)
               .input('estado', nuevoEstado)
               .input('id_usr_resp', id_usuario_responde)
               .input('id_tienda', solicitud.id_tienda) 
               .input('id_producto', solicitud.id_producto)
               .input('cantidad', solicitud.cantidad)
               .input('id_sede_central', ID_SEDE_CENTRAL)
               .input('id_movimiento_salida', `mov-${uuidv4().substring(0,8)}`)
               .input('id_movimiento_entrada', `mov-${uuidv4().substring(0,8)}`)
               .input('ip_origen', req.ip || '127.0.0.1'); 

        let sqlQuery = `
            BEGIN TRY
                BEGIN TRANSACTION;
                
                -- Variables de control
                DECLARE @id_inv_sede VARCHAR(50);
                DECLARE @stock_sede INT = 0;
        `;

        if (accion === 'APROBAR') {
            sqlQuery += `
                -- 1. VERIFICAR STOCK EN LA SEDE CENTRAL
                SELECT @id_inv_sede = id_inventario, @stock_sede = stock_disponible 
                FROM dbo.inventarios WITH (UPDLOCK) 
                WHERE id_tienda = @id_sede_central AND id_producto = @id_producto;

                IF (@id_inv_sede IS NULL OR @stock_sede < @cantidad)
                BEGIN
                    ROLLBACK TRANSACTION;
                    THROW 50003, 'Stock insuficiente en la Sede Central. La solicitud no puede ser aprobada.', 1;
                END

                -- 2. DESCONTAR DE LA SEDE CENTRAL (SALIDA)
                UPDATE dbo.inventarios 
                SET stock_disponible = stock_disponible - @cantidad, updated_at = SYSUTCDATETIME() 
                WHERE id_inventario = @id_inv_sede;

                INSERT INTO dbo.movimientos_inventario (id_movimiento, id_inventario, tipo_movimiento, cantidad, id_referencia, created_by)
                VALUES (@id_movimiento_salida, @id_inv_sede, 'TRASLADO_SALIDA', -@cantidad, @id_sol, @id_usr_resp);

                -- 3. AUMENTAR A LA SUCURSAL (ENTRADA)
                DECLARE @id_inv_sucursal VARCHAR(50);
                SELECT @id_inv_sucursal = id_inventario FROM dbo.inventarios WITH (UPDLOCK) WHERE id_tienda = @id_tienda AND id_producto = @id_producto;
                
                IF @id_inv_sucursal IS NULL
                BEGIN
                    SET @id_inv_sucursal = 'inv-' + LEFT(NEWID(), 8);
                    INSERT INTO dbo.inventarios (id_inventario, id_tienda, id_producto, stock_disponible, stock_reservado)
                    VALUES (@id_inv_sucursal, @id_tienda, @id_producto, @cantidad, 0);
                END
                ELSE
                BEGIN
                    UPDATE dbo.inventarios 
                    SET stock_disponible = stock_disponible + @cantidad, updated_at = SYSUTCDATETIME() 
                    WHERE id_inventario = @id_inv_sucursal;
                END

                INSERT INTO dbo.movimientos_inventario (id_movimiento, id_inventario, tipo_movimiento, cantidad, id_referencia, created_by)
                VALUES (@id_movimiento_entrada, @id_inv_sucursal, 'TRASLADO_ENTRADA', @cantidad, @id_sol, @id_usr_resp);
            `;
        }

        sqlQuery += `
                UPDATE dbo.solicitudes_stock 
                SET estado = @estado, id_usuario_responde = @id_usr_resp, updated_at = SYSUTCDATETIME()
                WHERE id_solicitud = @id_sol AND estado = 'PENDIENTE';

                IF @@ROWCOUNT = 0
                BEGIN
                    THROW 50002, 'La solicitud ya fue procesada por otro administrador o no existe.', 1;
                END

                DECLARE @id_auditoria VARCHAR(50) = 'aud-' + LEFT(NEWID(), 8);
                INSERT INTO dbo.auditoria_inventarios (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                VALUES (@id_auditoria, @id_usr_resp, 'solicitudes_stock', @id_sol, 'RESOLVER_SOLICITUD', JSON_MODIFY('{}', '$.nuevo_estado', @estado), @ip_origen);

                COMMIT TRANSACTION;
            END TRY
            BEGIN CATCH
                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                THROW;
            END CATCH
        `;

        // EJECUTAMOS LA TRANSACCIÓN
        await request.query(sqlQuery);

        // =========================================================================
        // 3. EVENTOS SERVICE BUS (Lógica de Consistencia Eventual No Bloqueante)
        // =========================================================================
        if (accion === 'APROBAR') {
            try { 
                const stockSucursal = await pool.request()
                    .input('id_t', solicitud.id_tienda)
                    .input('id_p', solicitud.id_producto)
                    .query(`SELECT id_inventario, stock_disponible FROM dbo.inventarios WHERE id_tienda = @id_t AND id_producto = @id_p`);
                
                const stockSede = await pool.request()
                    .input('id_t', ID_SEDE_CENTRAL)
                    .input('id_p', solicitud.id_producto)
                    .query(`SELECT id_inventario, stock_disponible FROM dbo.inventarios WHERE id_tienda = @id_t AND id_producto = @id_p`);
                
                // ✨ TU SOLUCIÓN: Empaquetamos a la Matriz y a la Sucursal en un solo envío
                await publicarEvento('STOCK_ACTUALIZADO_DUAL', {
                    id_producto: solicitud.id_producto,
                    matriz: {
                        id_inventario: stockSede.recordset[0].id_inventario,
                        id_tienda: ID_SEDE_CENTRAL,
                        stock_disponible: stockSede.recordset[0].stock_disponible,
                        stock_reservado: 0
                    },
                    sucursal: {
                        id_inventario: stockSucursal.recordset[0].id_inventario,
                        id_tienda: solicitud.id_tienda,
                        stock_disponible: stockSucursal.recordset[0].stock_disponible,
                        stock_reservado: 0
                    }
                });
            } catch (eventoError) {
                logger.error('CRÍTICO: El stock se guardó en BD pero falló el Service Bus', eventoError);
            } 
        }

        // RESPUESTA AL CLIENTE (Siempre se envía si la BD fue exitosa)
        res.status(200).json({ success: true, message: `Solicitud ${nuevoEstado} exitosamente.` });

    } catch (error: any) { // <-- ESTE ES EL CATCH GENERAL (Atrapa los THROW de la BD)
        if (error.number === 50002) {
            res.status(409).json({ error: error.message });
        } else if (error.number === 50003) {
            logger.warn(`Solicitud rechazada automáticamente: ${error.message}`);
            res.status(400).json({ error: error.message });
        } else {
            logger.error('Error respondiendo solicitud:', error);
            res.status(500).json({ error: 'Fallo interno al procesar la respuesta.' });
        }
    } // <-- Cierra el CATCH GENERAL
};

// GET: Obtener todas las tiendas con paginación y filtros
export const obtenerTodasTiendas = async (req: any, res: Response): Promise<void> => {
    try {
        const rolUsuario = req.usuarioRol;
        const idTiendaAsignada = req.usuarioTiendaId;

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const safeLimit = limit > 100 ? 100 : limit; 
        const offset = (page - 1) * safeLimit;
        
        const search = req.query.search ? `%${req.query.search}%` : null;
        const region = req.query.region || null;

        const pool = await getConnection();
        const request = pool.request();

        // Construcción dinámica del WHERE
        let whereClause = "WHERE deleted_at IS NULL";
        
        if (rolUsuario === 'Administrador' || rolUsuario === 'Cajero') {
            whereClause += " AND id_tienda = @id_tienda";
            request.input('id_tienda', idTiendaAsignada);
        }

        if (search) {
            whereClause += " AND (nombre LIKE @search OR direccion LIKE @search)";
            request.input('search', search);
        }

        if (region) {
            whereClause += " AND region = @region";
            request.input('region', region);
        }

        const query = `
            -- Contador total (Recordset 0)
            SELECT COUNT(*) as total_registros FROM dbo.tiendas ${whereClause};

            -- Datos paginados (Recordset 1)
            SELECT id_tienda, nombre, region, direccion, created_at
            FROM dbo.tiendas
            ${whereClause}
            ORDER BY created_at DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
        `;

        const result = await request
            .input('offset', offset)
            .input('limit', safeLimit)
            .query(query);

        // ✨ LA SOLUCIÓN: Castear a any[] para evitar el error de TypeScript
        const recordsets = result.recordsets as any[];
        
        // Extracción segura (con fallbacks por si SQL no devuelve nada)
        const totalRegistrosRow = recordsets[0] ? recordsets[0][0] : null;
        const totalRecords = totalRegistrosRow ? totalRegistrosRow.total_registros : 0;
        const tiendas = recordsets[1] || [];

        res.status(200).json({
            success: true,
            meta: {
                pagina_actual: page,
                productos_por_pagina: safeLimit,
                total_registros: totalRecords,
                total_paginas: Math.ceil(totalRecords / safeLimit)
            },
            data: tiendas
        });

    } catch (error) {
        logger.error('Error al obtener tiendas admin:', error);
        res.status(500).json({ error: 'Error interno al cargar sucursales.' });
    }
};

export const obtenerTiendasPublicas = async (req: Request, res: Response): Promise<void> => {
    try {
        const pool = await getConnection();
        
        // ✨ SÚPER OPTIMIZADO: Solo traemos id_tienda y nombre
        // Quitamos columnas inexistentes y validamos solo con deleted_at
        const result = await pool.request().query(`
            SELECT id_tienda, nombre 
            FROM dbo.tiendas 
            WHERE deleted_at IS NULL
            ORDER BY nombre ASC;
        `);

        res.status(200).json({ 
            success: true, 
            data: result.recordset 
        });

    } catch (error) {
        logger.error('Error al obtener la lista de tiendas públicas:', error);
        res.status(500).json({ 
            success: false, 
            error: 'No se pudieron cargar las sucursales.' 
        });
    }
};
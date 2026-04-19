import { Request, Response } from 'express';
import { logger } from '../utils/Logger';
import { getConnection } from '../config/Db';
import { v4 as uuidv4 } from 'uuid';
import xss from 'xss';
import { publicarEventoInventario } from '../events/EventPublisher';

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
        
        const idUsuarioReal = req.usuarioTransaccion || 'SISTEMA'; 
        const rolUsuario = req.usuarioRol || 'Admin';

        // 1. RESOLUCIÓN DE TIENDA
        const id_tienda = (rolUsuario === 'Admin' || rolUsuario === 'SuperAdmin' || rolUsuario === 'Cajero') 
            ? req.usuarioTiendaId || req.body.id_tienda 
            : req.body.id_tienda;

        if (!id_tienda) {
            res.status(400).json({ error: 'Operación rechazada: No se ha especificado una tienda válida.' });
            return;
        }

        // Validaciones básicas
        if (!['INGRESO', 'MERMA', 'TRASLADO', 'VENTA'].includes(tipo_movimiento)) {
             res.status(400).json({ error: 'Tipo de movimiento inválido.' });
             return;
        }
        if (!cantidad || cantidad === 0) {
             res.status(400).json({ error: 'La cantidad debe ser mayor o menor a cero.' });
             return;
        }

        const refLimpia = xss(id_referencia || 'AJUSTE_MANUAL');
        const pool = await getConnection();
        const idMovimiento = `mov-${uuidv4().substring(0,8)}`;
        const idAuditoria = `aud-${uuidv4().substring(0,8)}`; // ✨ Generamos el ID de auditoría aquí

        // 2. TRANSACCIÓN BLINDADA
        const reqTransaccion = pool.request();
        const resultado = await reqTransaccion
            .input('id_movimiento', idMovimiento)
            .input('id_tienda', id_tienda)
            .input('id_producto', id_producto)
            .input('cantidad', cantidad) 
            .input('tipo_movimiento', tipo_movimiento)
            .input('id_referencia', refLimpia)
            .input('id_usuario', idUsuarioReal)
            .input('ip_origen', req.ip || '127.0.0.1')
            .input('id_auditoria', idAuditoria) // ✨ Pasamos el parámetro
            .query(`
                BEGIN TRY
                    BEGIN TRANSACTION;

                    DECLARE @id_inventario VARCHAR(50);
                    DECLARE @stock_actual INT;

                    -- Bloqueamos la fila para evitar Race Conditions
                    SELECT @id_inventario = id_inventario, @stock_actual = stock_disponible 
                    FROM dbo.inventarios WITH (UPDLOCK)
                    WHERE id_tienda = @id_tienda AND id_producto = @id_producto;

                    IF @id_inventario IS NULL
                    BEGIN
                        IF @cantidad < 0 THROW 50001, 'No hay stock inicial para realizar mermas.', 1;
                        SET @id_inventario = 'inv-' + LEFT(NEWID(), 8);
                        INSERT INTO dbo.inventarios (id_inventario, id_tienda, id_producto, stock_disponible, stock_reservado)
                        VALUES (@id_inventario, @id_tienda, @id_producto, 0, 0);
                        SET @stock_actual = 0;
                    END

                    IF (@stock_actual + @cantidad < 0) THROW 50001, 'Stock insuficiente.', 1;

                    -- 1. Actualizar Inventario
                    UPDATE dbo.inventarios 
                    SET stock_disponible = stock_disponible + @cantidad, updated_at = SYSUTCDATETIME()
                    WHERE id_inventario = @id_inventario;

                    -- 2. Registrar Movimiento
                    INSERT INTO dbo.movimientos_inventario (id_movimiento, id_inventario, tipo_movimiento, cantidad, id_referencia, created_by)
                    VALUES (@id_movimiento, @id_inventario, @tipo_movimiento, @cantidad, @id_referencia, @id_usuario);

                    -- 3. Auditoría de Inventarios (Actualizado según diagrama)
                    DECLARE @valores_anteriores NVARCHAR(MAX) = JSON_MODIFY('{}', '$.stock_disponible', @stock_actual);
                    DECLARE @valores_nuevos NVARCHAR(MAX) = JSON_MODIFY(JSON_MODIFY('{}', '$.cantidad_ajuste', @cantidad), '$.stock_final', @stock_actual + @cantidad);
                    
                    INSERT INTO dbo.auditoria_inventarios (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_anteriores, valores_nuevos, ip_origen)
                    VALUES (@id_auditoria, @id_usuario, 'inventarios', @id_inventario, @tipo_movimiento, @valores_anteriores, @valores_nuevos, @ip_origen);

                    -- ✨ CORRECCIÓN: Extraemos el stock total sin el deleted_at
                    DECLARE @StockGlobal INT = (SELECT SUM(stock_disponible) FROM dbo.inventarios WHERE id_producto = @id_producto);
                    
                    COMMIT TRANSACTION;
                    
                    -- Devolvemos el stock global para mandarlo en el evento
                    SELECT @StockGlobal AS StockGlobal;
                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                    THROW;
                END CATCH
            `);

        const stockGlobalActualizado = resultado.recordset?.[0]?.StockGlobal || cantidad;

        // ✨ AVISAMOS A PRODUCTOS QUE EL STOCK CAMBIÓ
        await publicarEventoInventario('STOCK_ACTUALIZADO', {
            id_producto: id_producto,
            stock_total: stockGlobalActualizado
        });

        res.status(200).json({ success: true, message: 'Inventario actualizado correctamente.' });

    } catch (error: any) {
        if (error.number === 50001) {
            logger.warn(`Validación de stock fallida para usuario ${req.usuarioTransaccion}: ${error.message}`);
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
import { ServiceBusClient } from "@azure/service-bus";
import { logger } from "../utils/Logger";
import { getConnection } from "../config/Db";
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import WebSocket from "ws"; // ✨ NUEVO IMPORT

dotenv.config();

const connectionString = process.env.AZURE_SERVICEBUS_CONNECTION_STRING || '';
const topicInventarios = "tienda.inventarios";
const subInventarios = "sub-catalogo-seo";

// ✨ NUEVA CONFIGURACIÓN PARA VENTAS
const topicVentas = "tienda.ventas";
const subVentas = "sub-ventas-producto";

export const iniciarEscuchaEventos = async () => {
    if (!connectionString) {
        logger.error("Falta AZURE_SERVICEBUS_CONNECTION_STRING. El escuchador no iniciará.");
        return;
    }

    // ✨ AQUÍ ESTÁ LA MAGIA: Forzamos WebSockets
    const sbClient = new ServiceBusClient(connectionString, {
        webSocketOptions: {
            webSocket: WebSocket
        }
    });
    const receiverInventarios = sbClient.createReceiver(topicInventarios, subInventarios);
    const receiverVentas = sbClient.createReceiver(topicVentas, subVentas);

    logger.info(`🎧 Inventario escuchando Tópicos: [${topicInventarios}] y [${topicVentas}]`);

    const procesarMensajeInventarios = async (mensajeRecibido: any) => {
        try {
            const payload = mensajeRecibido.body.payload;
            const metadata = mensajeRecibido.body.metadata;

            // -------------------------------------------------------------
            // ESCENARIO 1: EVENTO DUAL (Aprobación de Surtido)
            // -------------------------------------------------------------
            if (metadata.evento === 'STOCK_ACTUALIZADO_DUAL') {
                console.log(`📥 [EVENTO DUAL] Recibido para el producto: ${payload.id_producto}`);
                
                const { matriz, sucursal, id_producto } = payload;
                const pool = await getConnection();

                // IDs de Réplica
                const id_rep_matriz = `rep-${matriz.id_inventario.replace('inv-', '')}`;
                const id_rep_sucursal = `rep-${sucursal.id_inventario.replace('inv-', '')}`;
                
                // IDs de Auditoría
                const id_aud_matriz = `aud-${uuidv4().substring(0,8)}`;
                const id_aud_sucursal = `aud-${uuidv4().substring(0,8)}`;

                // Ejecutamos todo en una poderosa transacción
                await pool.request()
                    .input('id_producto', id_producto)
                    
                    // Params Matriz
                    .input('inv_m', matriz.id_inventario)
                    .input('rep_m', id_rep_matriz)
                    .input('tie_m', matriz.id_tienda)
                    .input('disp_m', matriz.stock_disponible)
                    .input('aud_m', id_aud_matriz)
                    .input('val_m', JSON.stringify({ stock_disponible: matriz.stock_disponible, origen: 'SYNC_DUAL' }))
                    
                    // Params Sucursal
                    .input('inv_s', sucursal.id_inventario)
                    .input('rep_s', id_rep_sucursal)
                    .input('tie_s', sucursal.id_tienda)
                    .input('disp_s', sucursal.stock_disponible)
                    .input('aud_s', id_aud_sucursal)
                    .input('val_s', JSON.stringify({ stock_disponible: sucursal.stock_disponible, origen: 'SYNC_DUAL' }))
                    .query(`
                        BEGIN TRY
                            BEGIN TRANSACTION;

                            -- ===============================
                            -- 1. PROCESAR MATRIZ
                            -- ===============================
                            DECLARE @ex_m INT;
                            SELECT @ex_m = COUNT(*) FROM dbo.inventarios_replica WHERE id_inventario = @inv_m;

                            IF @ex_m > 0
                                UPDATE dbo.inventarios_replica SET stock_disponible = @disp_m, updated_at = SYSUTCDATETIME() WHERE id_inventario = @inv_m;
                            ELSE
                                INSERT INTO dbo.inventarios_replica (id_replica, id_inventario, id_tienda, id_producto, stock_disponible, stock_reservado)
                                VALUES (@rep_m, @inv_m, @tie_m, @id_producto, @disp_m, 0);

                            INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                            VALUES (@aud_m, 'SISTEMA_BUS', 'inventarios_replica', @inv_m, 'SYNC_INVENTARIO', @val_m, '127.0.0.1');

                            -- ===============================
                            -- 2. PROCESAR SUCURSAL
                            -- ===============================
                            DECLARE @ex_s INT;
                            SELECT @ex_s = COUNT(*) FROM dbo.inventarios_replica WHERE id_inventario = @inv_s;

                            IF @ex_s > 0
                                UPDATE dbo.inventarios_replica SET stock_disponible = @disp_s, updated_at = SYSUTCDATETIME() WHERE id_inventario = @inv_s;
                            ELSE
                                INSERT INTO dbo.inventarios_replica (id_replica, id_inventario, id_tienda, id_producto, stock_disponible, stock_reservado)
                                VALUES (@rep_s, @inv_s, @tie_s, @id_producto, @disp_s, 0);

                            INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                            VALUES (@aud_s, 'SISTEMA_BUS', 'inventarios_replica', @inv_s, 'SYNC_INVENTARIO', @val_s, '127.0.0.1');

                            COMMIT TRANSACTION;
                        END TRY
                        BEGIN CATCH
                            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                            THROW;
                        END CATCH
                    `);

                logger.info(`✅ Réplicas DUALES sincronizadas: Prod ${id_producto} | Matriz: ${matriz.stock_disponible} | Sucursal: ${sucursal.stock_disponible}`);
                await receiverInventarios.completeMessage(mensajeRecibido);
                return;
            }

// -------------------------------------------------------------
            // ESCENARIO 2: EVENTO SIMPLE (Mermas, Ajustes normales)
            // -------------------------------------------------------------
            if (metadata.evento === 'STOCK_ACTUALIZADO') {
                const { id_inventario, id_tienda, id_producto, stock_disponible, stock_reservado } = payload;
                console.log(`📥 [EVENTO SIMPLE] Actualizando Réplica | Tienda: ${id_tienda} | Disp: ${stock_disponible}`);

                const pool = await getConnection();
                const id_replica = `rep-${id_inventario.replace('inv-', '')}`;
                const id_auditoria = `aud-${uuidv4().substring(0,8)}`;
                const valoresNuevos = JSON.stringify({ stock_disponible, stock_reservado, origen: 'SYNC_SERVICE_BUS' });

                await pool.request()
                    .input('id_replica', id_replica)
                    .input('id_inv', id_inventario)
                    .input('id_t', id_tienda)
                    .input('id_p', id_producto)
                    .input('disp', stock_disponible)
                    .input('res', stock_reservado || 0)
                    .input('id_auditoria', id_auditoria)
                    .input('valores_nuevos', valoresNuevos)
                    .query(`
                        BEGIN TRY
                            BEGIN TRANSACTION;
                            DECLARE @existe INT;
                            SELECT @existe = COUNT(*) FROM dbo.inventarios_replica WHERE id_inventario = @id_inv;

                            IF @existe > 0
                                UPDATE dbo.inventarios_replica SET stock_disponible = @disp, stock_reservado = @res, updated_at = SYSUTCDATETIME() WHERE id_inventario = @id_inv;
                            ELSE
                                INSERT INTO dbo.inventarios_replica (id_replica, id_inventario, id_tienda, id_producto, stock_disponible, stock_reservado)
                                VALUES (@id_replica, @id_inv, @id_t, @id_p, @disp, @res);

                            INSERT INTO dbo.auditoria_productos (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen)
                            VALUES (@id_auditoria, 'SISTEMA_BUS', 'inventarios_replica', @id_inv, 'SYNC_INVENTARIO', @valores_nuevos, '127.0.0.1');
                            COMMIT TRANSACTION;
                        END TRY
                        BEGIN CATCH
                            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                            THROW;
                        END CATCH
                    `);

                logger.info(`✅ Réplica sincronizada en Productos: Prod ${id_producto} | Tienda ${id_tienda} | Stock: ${stock_disponible}`);
                await receiverInventarios.completeMessage(mensajeRecibido);
                return;
            }

            // Si es un evento que no nos interesa
            await receiverInventarios.completeMessage(mensajeRecibido);

        } catch (error) {
            logger.error(`❌ Error procesando evento en BD de Productos:`, error);
            try {
                await receiverInventarios.deadLetterMessage(mensajeRecibido, {
                    deadLetterReason: "ErrorProcesamientoBD",
                    deadLetterErrorDescription: error instanceof Error ? error.message : "Fallo desconocido"
                });
            } catch (dlqError) {}
        }
    };

    // 2. NUEVO MANEJADOR DE VENTAS (Solo actualiza la réplica visual)
    const procesarMensajeVentas = async (mensajeRecibido: any) => {
        try {
            const { metadata, payload } = mensajeRecibido.body;

            if (metadata.evento === 'VENTA_COMPLETADA') {
                const { id_venta, id_tienda, items } = payload;
                const pool = await getConnection();
                
                for (const item of items) {
                    await pool.request()
                        .input('id_t', id_tienda)
                        .input('id_p', item.id_producto)
                        .input('cant', item.cantidad)
                        .query(`
                            BEGIN TRY
                                BEGIN TRANSACTION;
                                -- Actualizamos la réplica visual para el catálogo
                                UPDATE dbo.inventarios_replica 
                                SET stock_disponible = stock_disponible - @cant,
                                    stock_reservado = stock_reservado + @cant,
                                    updated_at = SYSUTCDATETIME()
                                WHERE id_tienda = @id_t AND id_producto = @id_p;
                                COMMIT TRANSACTION;
                            END TRY
                            BEGIN CATCH
                                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                                THROW;
                            END CATCH
                        `);
                }
                logger.info(`✅ Réplica de catálogo actualizada por Venta ${id_venta}`);
                await receiverVentas.completeMessage(mensajeRecibido);
            }
            if (metadata.evento === 'PEDIDO_ENTREGADO') {
                const { id_venta, id_tienda, items } = payload;
                const pool = await getConnection();
                
                for (const item of items) {
                    await pool.request()
                        .input('id_t', id_tienda)
                        .input('id_p', item.id_producto)
                        .input('cant', item.cantidad)
                        .query(`
                            BEGIN TRY
                                BEGIN TRANSACTION;
                                
                                DECLARE @stock_reservado_actual INT;
                                SELECT @stock_reservado_actual = stock_reservado 
                                FROM dbo.inventarios_replica WITH (UPDLOCK) 
                                WHERE id_tienda = @id_t AND id_producto = @id_p;

                                -- Actualizamos la réplica visual vaciando la reserva
                                IF @stock_reservado_actual >= @cant
                                BEGIN
                                    UPDATE dbo.inventarios_replica 
                                    SET stock_reservado = stock_reservado - @cant,
                                        updated_at = SYSUTCDATETIME()
                                    WHERE id_tienda = @id_t AND id_producto = @id_p;
                                END
                                ELSE
                                BEGIN
                                    UPDATE dbo.inventarios_replica 
                                    SET stock_reservado = 0,
                                        updated_at = SYSUTCDATETIME()
                                    WHERE id_tienda = @id_t AND id_producto = @id_p;
                                END

                                COMMIT TRANSACTION;
                            END TRY
                            BEGIN CATCH
                                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                                THROW;
                            END CATCH
                        `);
                }
                logger.info(`✅ Réplica de catálogo actualizada: Reserva vaciada por Entrega de Venta ${id_venta}`);
                await receiverVentas.completeMessage(mensajeRecibido);
            }
        } catch (error) {
            logger.error(`❌ Error procesando evento en BD de Productos:`, error);
            try {
                await receiverVentas.deadLetterMessage(mensajeRecibido, {
                    deadLetterReason: "ErrorProcesamientoBD",
                    deadLetterErrorDescription: error instanceof Error ? error.message : "Fallo desconocido"
                });
            } catch (dlqError) {}
        }
    };

    const procesarError = async (errorInfo: any) => {
        logger.error(`❌ Error en la red de Service Bus: ${errorInfo.error}`);
    };

    receiverInventarios.subscribe({ processMessage: procesarMensajeInventarios, processError: procesarError });
    receiverVentas.subscribe({ processMessage: procesarMensajeVentas, processError: procesarError });
};
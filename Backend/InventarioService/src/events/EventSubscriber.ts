import { ServiceBusClient } from "@azure/service-bus";
import { logger } from "../utils/Logger";
import { getConnection } from "../config/Db";
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import WebSocket from "ws"; // ✨ NUEVO IMPORT

dotenv.config();

const connectionString = process.env.AZURE_SERVICEBUS_CONNECTION_STRING || '';
const topicProductos = "tienda.productos";
const subProductos = "sub-inventarios";

const topicVentas = "tienda.ventas";
const subVentas = "sub-ventas-inventario";

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
    // Creamos dos receptores: uno para productos y otro para ventas
    const receiverProductos = sbClient.createReceiver(topicProductos, subProductos);
    const receiverVentas = sbClient.createReceiver(topicVentas, subVentas);

    logger.info(`🎧 Inventario escuchando Tópicos: [${topicProductos}] y [${topicVentas}]`);

    const procesarMensajeProductos = async (mensajeRecibido: any) => {
        try {
            // 1. Extraemos los datos del cuerpo del mensaje
            // Nota: Usamos los nombres exactos que vienen de ProductService
            const payload = mensajeRecibido.body.payload;
        
            // LOG DE DEPURACIÓN (Mira esto en tu consola al recibir el mensaje)
            console.log("📥 Datos recibidos del Bus:", payload);

            const { id_producto, stock_inicial, id_tienda } = payload;

            // VALIDACIÓN DE SEGURIDAD
            if (!id_tienda || !id_producto) {
                logger.warn(`⚠️ Mensaje ignorado: Faltan datos críticos (Tienda: ${id_tienda}, Producto: ${id_producto})`);
                await receiverProductos.completeMessage(mensajeRecibido); // Lo quitamos de la cola porque está mal formado
                return;
            }

            const pool = await getConnection();
            const idInvNuevo = `inv-${uuidv4().substring(0, 8)}`;
            const idMovNuevo = `mov-${uuidv4().substring(0, 8)}`;

            // 2. Ejecutamos la transacción SQL blindada
            await pool.request()
                .input('id_p', id_producto)    // Usamos las variables desestructuradas
                .input('id_t', id_tienda)
                .input('cant', stock_inicial || 0)
                .input('id_inv_nuevo', idInvNuevo)
                .input('id_mov_nuevo', idMovNuevo)
                .query(`
                    BEGIN TRY
                        BEGIN TRANSACTION;

                        DECLARE @id_inv_real VARCHAR(50);
                        SELECT @id_inv_real = id_inventario FROM dbo.inventarios WHERE id_tienda = @id_t AND id_producto = @id_p;

                        IF @id_inv_real IS NULL
                        BEGIN
                            SET @id_inv_real = @id_inv_nuevo;
                            INSERT INTO dbo.inventarios (id_inventario, id_tienda, id_producto, stock_disponible, stock_reservado)
                            VALUES (@id_inv_real, @id_t, @id_p, @cant, 0);
                        END
                        ELSE
                        BEGIN
                            UPDATE dbo.inventarios 
                            SET stock_disponible = stock_disponible + @cant, updated_at = SYSUTCDATETIME()
                            WHERE id_inventario = @id_inv_real;
                        END

                        IF @cant > 0
                        BEGIN
                            INSERT INTO dbo.movimientos_inventario (id_movimiento, id_inventario, tipo_movimiento, cantidad, id_referencia, created_by)
                            VALUES (@id_mov_nuevo, @id_inv_real, 'INGRESO_INICIAL', @cant, 'EVENTO_BUS_PRODUCTOS', 'SISTEMA_EVENTOS');
                        END

                        COMMIT TRANSACTION;
                    END TRY
                    BEGIN CATCH
                        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                        THROW;
                    END CATCH
                `);

            logger.info(`✅ Stock inicial procesado para producto ${id_producto} en tienda ${id_tienda}`);
            
            // 3. MUY IMPORTANTE: Avisar a Service Bus que el mensaje se procesó con éxito
            await receiverProductos.completeMessage(mensajeRecibido);

        } catch (error) {
            logger.error(`❌ Error procesando evento:`, error);
            
            // 👇 CAMBIO: Enviar el mensaje roto a la Dead Letter Queue (Cola de Mensajes Muertos)
            // Esto evita que el mensaje regrese a la cola principal y sature tu base de datos cobrándote de más.
            try {
                await receiverProductos.deadLetterMessage(mensajeRecibido, {
                    deadLetterReason: "ErrorProcesamientoBD",
                    deadLetterErrorDescription: error instanceof Error ? error.message : "Fallo desconocido al procesar transacción"
                });
                logger.info("Mensaje movido a la cola de mensajes muertos (DLQ).");
            } catch (dlqError) {
                logger.error("Fallo crítico: No se pudo mover el mensaje a DLQ", dlqError);
            }
        }
    };

    // ==========================================
    // 2. NUEVO MANEJADOR DE EVENTOS DE VENTAS
    // ==========================================
    const procesarMensajeVentas = async (mensajeRecibido: any) => {
        try {
            const { metadata, payload } = mensajeRecibido.body;

            // ✨ RESERVAR STOCK
            if (metadata.evento === 'VENTA_COMPLETADA') {
                const { id_venta, id_tienda, id_usuario, items } = payload;
                const pool = await getConnection();
                
                for (const item of items) {
                    const idMovNuevo = `mov-${uuidv4().substring(0, 8)}`;
                    await pool.request()
                        .input('id_t', id_tienda).input('id_p', item.id_producto).input('cant', item.cantidad)
                        .input('id_venta', id_venta).input('id_usr', id_usuario).input('id_mov', idMovNuevo)
                        .query(`
                            BEGIN TRY
                                BEGIN TRANSACTION;
                                DECLARE @id_inv VARCHAR(50);
                                SELECT @id_inv = id_inventario FROM dbo.inventarios WITH (UPDLOCK) WHERE id_tienda = @id_t AND id_producto = @id_p;

                                IF @id_inv IS NOT NULL
                                BEGIN
                                    -- AQUÍ SÍ ES LA TABLA DE INVENTARIOS CORRECTA
                                    UPDATE dbo.inventarios 
                                    SET stock_disponible = stock_disponible - @cant,
                                        stock_reservado = stock_reservado + @cant,
                                        updated_at = SYSUTCDATETIME()
                                    WHERE id_inventario = @id_inv;

                                    INSERT INTO dbo.movimientos_inventario (id_movimiento, id_inventario, tipo_movimiento, cantidad, id_referencia, created_by)
                                    VALUES (@id_mov, @id_inv, 'RESERVA_ONLINE', -@cant, @id_venta, @id_usr);
                                END
                                COMMIT TRANSACTION;
                            END TRY
                            BEGIN CATCH
                                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                                THROW;
                            END CATCH
                        `);
                }
                logger.info(`✅ Stock reservado exitosamente (Venta ${id_venta})`);
                await receiverVentas.completeMessage(mensajeRecibido);
            }
            
            // ✨ LIBERAR RESERVA (ENTREGA AL CLIENTE)
            else if (metadata.evento === 'PEDIDO_ENTREGADO') {
                const { id_venta, id_tienda, items, id_cajero } = payload;
                const pool = await getConnection();
                
                for (const item of items) {
                    const idMovNuevo = `mov-${uuidv4().substring(0, 8)}`;
                    await pool.request()
                        .input('id_t', id_tienda).input('id_p', item.id_producto).input('cant', item.cantidad)
                        .input('id_venta', id_venta).input('id_usr', id_cajero).input('id_mov', idMovNuevo)
                        .query(`
                            BEGIN TRY
                                BEGIN TRANSACTION;
                                DECLARE @id_inv VARCHAR(50);
                                SELECT @id_inv = id_inventario FROM dbo.inventarios WITH (UPDLOCK) WHERE id_tienda = @id_t AND id_producto = @id_p;

                                IF @id_inv IS NOT NULL
                                BEGIN
                                    UPDATE dbo.inventarios 
                                    SET stock_reservado = CASE WHEN stock_reservado >= @cant THEN stock_reservado - @cant ELSE 0 END,
                                        updated_at = SYSUTCDATETIME()
                                    WHERE id_inventario = @id_inv;

                                    INSERT INTO dbo.movimientos_inventario (id_movimiento, id_inventario, tipo_movimiento, cantidad, id_referencia, created_by)
                                    VALUES (@id_mov, @id_inv, 'ENTREGA_BOPIS', -@cant, @id_venta, @id_usr);
                                END
                                COMMIT TRANSACTION;
                            END TRY
                            BEGIN CATCH
                                IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
                                THROW;
                            END CATCH
                        `);
                }
                logger.info(`✅ Reserva eliminada por entrega (Venta ${id_venta})`);
                await receiverVentas.completeMessage(mensajeRecibido);
            }
            else {
                await receiverVentas.completeMessage(mensajeRecibido);
            }
        } catch (error) {
            logger.error(`❌ Error procesando evento:`, error);
            
            // 👇 CAMBIO: Enviar el mensaje roto a la Dead Letter Queue (Cola de Mensajes Muertos)
            // Esto evita que el mensaje regrese a la cola principal y sature tu base de datos cobrándote de más.
            try {
                await receiverVentas.deadLetterMessage(mensajeRecibido, {
                    deadLetterReason: "ErrorProcesamientoBD",
                    deadLetterErrorDescription: error instanceof Error ? error.message : "Fallo desconocido al procesar transacción"
                });
                logger.info("Mensaje movido a la cola de mensajes muertos (DLQ).");
            } catch (dlqError) {
                logger.error("Fallo crítico: No se pudo mover el mensaje a DLQ", dlqError);
            }
        }
    };

    const procesarError = async (errorInfo: any) => {
        logger.error(`Error en la conexión con Service Bus: ${errorInfo.error}`);
    };

    // Suscribimos ambos receptores
    receiverProductos.subscribe({ processMessage: procesarMensajeProductos, processError: procesarError });
    receiverVentas.subscribe({ processMessage: procesarMensajeVentas, processError: procesarError });
};
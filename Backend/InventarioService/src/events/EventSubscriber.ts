import { ServiceBusClient } from "@azure/service-bus";
import { logger } from "../utils/Logger";
import { getConnection } from "../config/Db";
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import WebSocket from "ws"; // ✨ NUEVO IMPORT

dotenv.config();

const connectionString = process.env.AZURE_SERVICEBUS_CONNECTION_STRING || '';
const topicName = "tienda.productos";
const subscriptionName = "sub-inventarios";

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
    const receiver = sbClient.createReceiver(topicName, subscriptionName);

    logger.info(`🎧 Inventario escuchando eventos por WebSockets en Tópico: ${topicName} | Sub: ${subscriptionName}`);

    const procesarMensaje = async (mensajeRecibido: any) => {
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
                await receiver.completeMessage(mensajeRecibido); // Lo quitamos de la cola porque está mal formado
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
            await receiver.completeMessage(mensajeRecibido);

        } catch (error) {
            logger.error(`❌ Error procesando evento:`, error);
            
            // 👇 CAMBIO: Enviar el mensaje roto a la Dead Letter Queue (Cola de Mensajes Muertos)
            // Esto evita que el mensaje regrese a la cola principal y sature tu base de datos cobrándote de más.
            try {
                await receiver.deadLetterMessage(mensajeRecibido, {
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

    receiver.subscribe({
        processMessage: procesarMensaje,
        processError: procesarError
    });
};
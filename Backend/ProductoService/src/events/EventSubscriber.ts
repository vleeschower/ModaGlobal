import { ServiceBusClient } from "@azure/service-bus";
import { logger } from "../utils/Logger";
import { getConnection } from "../config/Db";
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.AZURE_SERVICEBUS_CONNECTION_STRING || '';
const topicName = "tienda.inventarios"; // Escuchamos lo que dice Inventarios
const subscriptionName = "sub-catalogo-seo"; 

export const iniciarEscuchaInventarios = async () => {
    if (!connectionString) return;

    const sbClient = new ServiceBusClient(connectionString);
    const receiver = sbClient.createReceiver(topicName, subscriptionName);

    const procesarMensaje = async (mensajeRecibido: any) => {
        try {
            const metadata = mensajeRecibido.body.metadata;
            const payload = mensajeRecibido.body.payload;

            if (metadata.evento === 'STOCK_ACTUALIZADO') {
                const { id_producto, stock_total } = payload;
                const pool = await getConnection();
                
                // Si stock > 0, tiene_stock = 1. Si no, 0.
                const banderaStock = stock_total > 0 ? 1 : 0;

                await pool.request()
                    .input('id_p', id_producto)
                    .input('tiene_stock', banderaStock)
                    .query(`
                        UPDATE dbo.productos 
                        SET tiene_stock = @tiene_stock 
                        WHERE id_producto = @id_p;
                    `);
                
                logger.info(`♻️ SEO Actualizado: Producto ${id_producto} (tiene_stock = ${banderaStock})`);
            }

            await receiver.completeMessage(mensajeRecibido);
        } catch (error) {
            logger.error(`Error procesando evento SEO:`, error);
        }
    };

    receiver.subscribe({
        processMessage: procesarMensaje,
        processError: async (e) => {
            logger.error(`Error en Service Bus SEO: ${e.error}`);
        }
    });
    logger.info(`🎧 Catalogo/SEO escuchando inventarios...`);
};
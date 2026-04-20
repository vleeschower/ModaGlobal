import { ServiceBusClient, ServiceBusMessage } from "@azure/service-bus";
import { logger } from "../utils/Logger";
import dotenv from 'dotenv';

dotenv.config();

// Inicializamos el cliente de Azure usando tu .env
const connectionString = process.env.AZURE_SERVICEBUS_CONNECTION_STRING || '';
const topicName = "tienda.productos";

let sbClient: ServiceBusClient;
let sender: any;

try {
    if (connectionString) {
        sbClient = new ServiceBusClient(connectionString);
        sender = sbClient.createSender(topicName);
        logger.info(`Conectado exitosamente a Azure Service Bus (Tópico: ${topicName})`);
    } else {
        logger.warn("No se encontró la cadena de conexión de Service Bus.");
    }
} catch (error) {
    logger.error("Error al conectar con Azure Service Bus", error);
}

export const publicarEvento = async (tipoEvento: string, datos: any) => {
    if (!sender) {
        logger.error("No se puede publicar el evento. El bus no está conectado.");
        return;
    }

    try {
        // Estructuramos el mensaje estándar para toda la empresa
        const mensaje: ServiceBusMessage = {
            body: {
                metadata: {
                    evento: tipoEvento,
                    timestamp: new Date().toISOString(),
                    origen: "ProductService"
                },
                payload: datos
            },
            contentType: "application/json",
            subject: tipoEvento
        };

        await sender.sendMessages(mensaje);
        logger.info(`Evento emitido al Bus 📢: [${tipoEvento}] para ID: ${datos.id_producto || 'N/A'}`);
    } catch (error) {
        logger.error(`Fallo al emitir evento ${tipoEvento}`, error);
    }
};
import { ServiceBusClient, ServiceBusMessage } from "@azure/service-bus";
import { logger } from "../utils/Logger";
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import WebSocket from "ws"; // ✨ NUEVO IMPORT

dotenv.config();

const connectionString = process.env.AZURE_SERVICEBUS_CONNECTION_STRING || '';
const topicName = "tienda.inventarios"; 

let sbClient: ServiceBusClient;
let sender: any;

try {
    if (connectionString) {
        // ✨ AQUÍ ESTÁ LA MAGIA: Forzamos WebSockets
        sbClient = new ServiceBusClient(connectionString, {
            webSocketOptions: {
                webSocket: WebSocket
            }
        });
        sender = sbClient.createSender(topicName);
        logger.info(`Conectado a Azure Service Bus por WebSockets (Tópico: ${topicName})`);
    } else {
        logger.warn("No se encontró la cadena de conexión de Service Bus.");
    }
} catch (error) {
    logger.error("Error al conectar con Azure Service Bus", error);
}

export const publicarEvento = async (tipoEvento: string, datos: any) => {
    if (!sender) return;

    try {
        const idUnico = `msg-${uuidv4()}`;
        const mensaje: ServiceBusMessage = {
            messageId: idUnico,
            body: {
                metadata: { evento: tipoEvento, timestamp: new Date().toISOString(), origen: "InventarioService" },
                payload: datos
            },
            contentType: "application/json",
            subject: tipoEvento
        };

        await sender.sendMessages(mensaje);
        logger.info(`📢 Evento emitido: [${tipoEvento}] ID: ${idUnico} | Tienda: ${datos.id_tienda}`);
    } catch (error) {
        logger.error(`Fallo al emitir evento ${tipoEvento}`, error);
    }
};
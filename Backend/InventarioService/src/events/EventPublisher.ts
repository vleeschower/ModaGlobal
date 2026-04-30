import { ServiceBusClient, ServiceBusMessage } from "@azure/service-bus";
import { logger } from "../utils/Logger";
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import WebSocket from "ws";

dotenv.config();

const connectionString = process.env.AZURE_SERVICEBUS_CONNECTION_STRING || '';
const topicName = "tienda.inventarios"; 

let sbClient: ServiceBusClient;
let sender: any;

try {
    if (connectionString) {
        sbClient = new ServiceBusClient(connectionString, {
            webSocketOptions: {
                webSocket: WebSocket
            }
        });
        sender = sbClient.createSender(topicName);
        logger.info(`✅ Conectado a Azure Service Bus por WebSockets (Tópico: ${topicName})`);
    } else {
        logger.warn("⚠️ No se encontró AZURE_SERVICEBUS_CONNECTION_STRING en el .env.");
    }
} catch (error) {
    logger.error("❌ Error al conectar con Azure Service Bus", error);
}

export const publicarEvento = async (tipoEvento: string, datos: any) => {
    // ✨ CORRECCIÓN: Si no hay sender, AVISAMOS EN LA TERMINAL en lugar de fallar en silencio
    if (!sender) {
        logger.warn(`🛑 ATENCIÓN: El evento [${tipoEvento}] NO se envió. El sender de Service Bus no está inicializado.`);
        return;
    }

    try {
        console.log(`📤 [PUBLICADOR] Preparando envío de evento: ${tipoEvento}`, datos);
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
        logger.info(`📢 Evento emitido al BUS: [${tipoEvento}] ID: ${idUnico}`);

    } catch (error) {
        logger.error(`❌ Fallo crítico al emitir evento ${tipoEvento}`, error);
    }
};
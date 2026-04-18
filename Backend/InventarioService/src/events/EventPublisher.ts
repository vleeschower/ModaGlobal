import { ServiceBusClient, ServiceBusMessage } from "@azure/service-bus";
import { logger } from "../utils/Logger";
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.AZURE_SERVICEBUS_CONNECTION_STRING || '';
const topicName = "tienda.inventarios"; // ✨ Usamos un tópico distinto para que Inventarios "hable"

let sbClient: ServiceBusClient;
let sender: any;

if (connectionString) {
    sbClient = new ServiceBusClient(connectionString);
    sender = sbClient.createSender(topicName);
}

export const publicarEventoInventario = async (tipoEvento: string, datos: any) => {
    if (!sender) return;
    try {
        const mensaje: ServiceBusMessage = {
            body: {
                metadata: { evento: tipoEvento, timestamp: new Date().toISOString(), origen: "InventarioService" },
                payload: datos
            },
            contentType: "application/json",
            subject: tipoEvento
        };
        await sender.sendMessages(mensaje);
        logger.info(`📢 Evento de Inventario emitido: [${tipoEvento}]`);
    } catch (error) {
        logger.error(`Fallo al emitir evento ${tipoEvento}`, error);
    }
};
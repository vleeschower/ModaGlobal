import { ServiceBusClient, ServiceBusMessage } from "@azure/service-bus";
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import WebSocket from "ws";

dotenv.config();

const connectionString = process.env.AZURE_SERVICEBUS_CONNECTION_STRING || '';
const topicName = "tienda.ventas"; // ✨ NUEVO TÓPICO

let sbClient: ServiceBusClient;
let sender: any;

try {
    if (connectionString) {
        sbClient = new ServiceBusClient(connectionString, {
            webSocketOptions: { webSocket: WebSocket }
        });
        sender = sbClient.createSender(topicName);
        console.log(`✅ Ventas conectado a Service Bus (Tópico: ${topicName})`);
    }
} catch (error) {
    console.error("❌ Error al conectar con Azure Service Bus", error);
}

export const publicarEventoVenta = async (tipoEvento: string, datos: any) => {
    if (!sender) {
        console.warn(`🛑 ATENCIÓN: Evento [${tipoEvento}] NO enviado. Bus no conectado.`);
        return;
    }

    try {
        const idUnico = `msg-${uuidv4()}`;
        const mensaje: ServiceBusMessage = {
            messageId: idUnico,
            body: {
                metadata: { evento: tipoEvento, timestamp: new Date().toISOString(), origen: "VentasService" },
                payload: datos
            },
            contentType: "application/json",
            subject: tipoEvento
        };

        await sender.sendMessages(mensaje);
        console.log(`📢 Evento emitido al BUS: [${tipoEvento}] Venta ID: ${datos.id_venta}`);
    } catch (error) {
        console.error(`❌ Fallo crítico al emitir evento ${tipoEvento}`, error);
    }
};
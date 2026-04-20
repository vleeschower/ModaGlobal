import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import inventoryRoutes from './routes/InventarioRoutes';
import { iniciarEscuchaEventos } from './events/EventSubscriber'; // Importamos el listener
import { logger } from './utils/Logger';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001; // Inventario suele usar el 3001

app.use(cors());
app.use(express.json());

// Montamos las rutas (Recuerda que el Gateway le quita el /api/inventario)
app.use('/', inventoryRoutes);

app.listen(PORT, async () => {
    logger.info(`📦 InventoryService iniciado en puerto ${PORT}`);
    
    // Encendemos la "antena" de Azure Service Bus
    await iniciarEscuchaEventos();
});
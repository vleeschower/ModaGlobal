// src/server.ts
import app from './app';
import { logger } from './utils/Logger';
import { probarConexion } from './config/Db';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3003; 

app.listen(PORT, async () => {
    logger.info(`VentasService desplegado en el puerto ${PORT}`);
    
    logger.info('Iniciando prueba de conexión a Azure (Prisma)...');
    await probarConexion();
});
import app from './app';
import { logger } from './utils/Logger';
import { probarConexion } from './config/Db';
import dotenv from 'dotenv';
import { iniciarEscuchaEventos } from './events/EventSubscriber';

dotenv.config();

const PORT = process.env.PORT || 3002; // Usamos 3002 para que no choque con Inventarios (3001)

app.listen(PORT, async () => {
    logger.info(`ProductoService desplegado en el puerto ${PORT}`);
    
    // Ejecutamos la prueba inofensiva al arrancar
    logger.info('Iniciando prueba de conexión a Azure...');
    await probarConexion();


    iniciarEscuchaEventos();
});
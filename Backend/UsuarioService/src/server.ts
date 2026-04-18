import app from './app';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
    logger.info(`Servicio de Usuarios corriendo en puerto ${PORT}`);
    logger.info(`Esperando peticiones del Gateway en http://localhost:${PORT}`);
});
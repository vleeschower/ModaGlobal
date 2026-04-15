import app from './app';
import { logger } from './utils/logger';

// Tipamos el puerto como string o number
const PORT: string | number = process.env.PORT || 3001;

app.listen(PORT, () => {
    logger.info(`Microservicio de Inventario (TS) inicializado y escuchando en puerto ${PORT}`);
});
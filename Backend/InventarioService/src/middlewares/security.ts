import { NextFunction } from 'express';
import { logger } from '../utils/logger';

export const verificarAcceso = (req: any, res: any, next: NextFunction): void => {
    // TypeScript sabe que los headers pueden ser un string o un arreglo, por eso forzamos la lectura
    const apiKey = req.headers['x-api-key'] as string | undefined;

    if (!apiKey || apiKey !== 'clave-secreta-interna-modaglobal') {
        logger.error(`Intento de acceso denegado desde IP: ${req.ip}`);
        res.status(403).json({ error: 'Acceso no autorizado al microservicio' });
        return; // Retornamos para detener la ejecución
    }

    logger.info(`Acceso autorizado para la ruta: ${req.originalUrl}`);
    next(); // Permite que la petición continúe
};
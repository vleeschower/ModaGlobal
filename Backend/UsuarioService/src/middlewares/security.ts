import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const verificarAcceso = (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.headers['x-api-key'] as string | undefined;

    // Solo el Gateway conoce esta clave
    if (!apiKey || apiKey !== 'clave-secreta-interna-modaglobal') {
        logger.error(`Acceso denegado a UsuarioService desde IP: ${req.ip}`);
        res.status(403).json({ 
            success: false,
            error: 'Acceso no autorizado al microservicio de usuarios' 
        });
        return;
    }
    next();
};
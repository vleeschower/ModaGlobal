import { NextFunction } from 'express';
import { logger } from '../utils/Logger';

// 1. NUEVO MIDDLEWARE: Solo valida que venga del API Gateway (Para rutas públicas)
export const verificarApiKey = (req: any, res: any, next: NextFunction): void => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
        logger.error(`BLOQUEO: Intento de bypass de Gateway desde IP: ${req.ip}`);
        return res.status(403).json({ error: 'Acceso denegado. Use el API Gateway.' });
    }
    next();
};

// 2. MIDDLEWARE MODIFICADO: Valida la sesión del usuario (Para rutas protegidas)
export const verificarAccesoInterno = (req: any, res: any, next: NextFunction): void => {
    const userId = req.headers['x-user-id'];
    const userRol = req.headers['x-user-rol'];
    const tiendaId = req.headers['x-user-tienda-id'];

    if (!userId || !userRol) {
        logger.error(`BLOQUEO: Petición sin identidad de usuario o rol.`);
        return res.status(401).json({ error: 'Identidad o rol de usuario no proporcionados.' });
    }

    if ((userRol === 'Administrador' || userRol === 'Cajero') && !tiendaId) {
        logger.error(`BLOQUEO: ${userRol} (ID: ${userId}) intentó operar sin sucursal asignada.`);
        return res.status(403).json({ 
            error: `Operación denegada. El rol ${userRol} requiere una sucursal física asignada en el sistema.` 
        });
    }

    req.usuarioTransaccion = userId;
    req.usuarioRol = userRol;
    req.usuarioTiendaId = tiendaId || null; 

    next();
};

// 3. MIDDLEWARE DE ROLES (Se queda exactamente igual)
export const verificarRol = (rolesPermitidos: string[]) => {
    return (req: any, res: any, next: any) => {
        const rolUsuario = req.usuarioRol;
        if (!rolesPermitidos.includes(rolUsuario)) {
            return res.status(403).json({ 
                error: `Acceso denegado. Se requiere nivel de acceso: ${rolesPermitidos.join(' o ')}` 
            });
        }
        next();
    };
};
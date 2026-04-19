import { NextFunction } from 'express';
import { logger } from '../utils/Logger';

export const verificarAccesoInterno = (req: any, res: any, next: NextFunction): void => {
    const apiKey = req.headers['x-api-key'];
    const userId = req.headers['x-user-id'];
    const userRol = req.headers['x-user-rol'];
    const tiendaId = req.headers['x-user-tienda-id']; 

    // 1. Validar que la petición venga del Gateway (Zero Trust)
    if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
        logger.error(`BLOQUEO: Intento de bypass de Gateway desde IP: ${req.ip}`);
        return res.status(403).json({ error: 'Acceso denegado. Use el API Gateway.' });
    }

    if (!userId || !userRol) {
        logger.error(`BLOQUEO: Petición sin identidad de usuario o rol.`);
        return res.status(401).json({ error: 'Identidad o rol de usuario no proporcionados.' });
    }

    // ✨ REGLA CORREGIDA: SuperAdministrador NO necesita tienda. Administrador y Cajero SÍ.
    if ((userRol === 'Administrador' || userRol === 'Cajero') && !tiendaId) {
        logger.error(`BLOQUEO: ${userRol} (ID: ${userId}) intentó operar sin sucursal asignada.`);
        return res.status(403).json({ 
            error: `Operación denegada. El rol ${userRol} requiere una sucursal física asignada en el sistema.` 
        });
    }

    // 4. Guardamos el contexto limpio en el request para los controladores
    req.usuarioTransaccion = userId; 
    req.usuarioRol = userRol;
    // Si es SuperAdministrador, tiendaId vendrá vacío, lo cual es correcto.
    req.usuarioTiendaId = tiendaId || null; 

    next();
};

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
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

export const verificarAccesoInterno = (req: any, res: any, next: NextFunction): void => {
    const apiKey = req.headers['x-api-key'];
    const userId = req.headers['x-user-id'];
    const userRol = req.headers['x-user-rol'];
    const tiendaId = req.headers['x-user-tienda-id']; // La nueva identidad propagada

    // 1. Validar que la petición venga del Gateway (Zero Trust)
    if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
        logger.error(`BLOQUEO: Intento de bypass de Gateway desde IP: ${req.ip}`);
        return res.status(403).json({ error: 'Acceso denegado. Use el API Gateway.' });
    }

    // 2. Validar que tengamos la identidad básica
    if (!userId || !userRol) {
        logger.error(`BLOQUEO: Petición sin identidad de usuario o rol.`);
        return res.status(401).json({ error: 'Identidad o rol de usuario no proporcionados.' });
    }

    // 3. LA NUEVA REGLA DE NEGOCIO: Admins y Cajeros no pueden existir sin sucursal
    if ((userRol === 'Administrador' || userRol === 'Cajero') && !tiendaId) {
        logger.error(`BLOQUEO: ${userRol} (ID: ${userId}) intentó operar sin sucursal asignada.`);
        return res.status(403).json({ 
            error: 'Operación denegada. Su cuenta no tiene una sucursal física asignada en el sistema.' 
        });
    }

    // 4. Guardamos el contexto limpio en el request para los controladores
    req.usuarioTransaccion = userId; 
    req.usuarioRol = userRol;
    req.usuarioTiendaId = tiendaId || null; // Clientes o SuperAdmins pueden tenerlo vacío

    next();
};

export const verificarRol = (rolesPermitidos: string[]) => {
    return (req: any, res: any, next: any) => {
        // Tomamos el rol directamente del contexto que limpiamos en el paso anterior
        const rolUsuario = req.usuarioRol;

        // Validamos si tiene el nivel de acceso requerido
        if (!rolesPermitidos.includes(rolUsuario)) {
            return res.status(403).json({ 
                error: `Acceso denegado. Se requiere nivel de acceso: ${rolesPermitidos.join(' o ')}` 
            });
        }

        next();
    };
};
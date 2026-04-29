// src/middlewares/Security.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/Logger';

// Extendemos Request de Express de forma rápida para no tener errores de TS
export interface CustomRequest extends Request {
    usuarioTransaccion?: string;
    usuarioRol?: string;
    usuarioTiendaId?: string | null;
}

export const verificarAccesoInterno = (req: CustomRequest, res: Response, next: NextFunction): void => {
    const apiKey = req.headers['x-api-key'];
    const userId = req.headers['x-user-id'] as string;
    const userRol = req.headers['x-user-rol'] as string;
    const tiendaId = req.headers['x-user-tienda-id'] as string;

    // ====== EL DETECTOR DE CHISMES ======
    console.log("\n====== DEBUG DEL GATEWAY ======");
    console.log("Llave recibida:", apiKey);
    console.log("ID de Usuario:", userId);
    console.log("Rol de Usuario:", userRol);
    console.log("===============================\n");

// 1. PRENDEMOS EL GUARDIA DE LA LLAVE OTRA VEZ
    if (!apiKey || apiKey !== 'clave-secreta-interna-modaglobal') {
        logger.error(`BLOQUEO: Intento de bypass de Gateway desde IP: ${req.ip}`);
        res.status(403).json({ error: 'Acceso denegado. Use el API Gateway.' });
        return;
    }

    // 2. Este sí lo dejamos prendido para ver si el Gateway te manda tu ID
    if (!userId || !userRol) {
        logger.error(`BLOQUEO: Petición sin identidad de usuario o rol.`);
        res.status(401).json({ error: 'Identidad o rol de usuario no proporcionados.' });
        return;
    }

    // REGLA: SuperAdministrador NO necesita tienda. Administrador y Cajero SÍ.
    if ((userRol === 'Administrador' || userRol === 'Cajero') && !tiendaId) {
        logger.error(`BLOQUEO: ${userRol} (ID: ${userId}) intentó operar sin sucursal asignada.`);
        res.status(403).json({ 
            error: `Operación denegada. El rol ${userRol} requiere una sucursal física asignada en el sistema.` 
        });
        return;
    }

    // Guardamos el contexto limpio
    req.usuarioTransaccion = userId;
    req.usuarioRol = userRol;
    req.usuarioTiendaId = tiendaId || null; 

    next();
};

export const verificarRol = (rolesPermitidos: string[]) => {
    return (req: CustomRequest, res: Response, next: NextFunction): void => {
        const rolUsuario = req.usuarioRol;

        if (!rolUsuario || !rolesPermitidos.includes(rolUsuario)) {
            res.status(403).json({ 
                error: `Acceso denegado. Se requiere nivel de acceso: ${rolesPermitidos.join(' o ')}` 
            });
            return;
        }
        next();
    };
};
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        rol: string;
        tienda_id?: string;
    };
}

interface TokenPayload {
    id?: string;
    id_usuario?: string;
    rol: string;
    id_tienda?: string;
}

export const validarAccesoGoblal = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    // 1. Si no hay token o manda la palabra "null" desde localStorage
    if (!token || token === 'null' || token === 'undefined') {
        return next(); 
    }

    try {
        const secret = process.env.JWT_SECRET || 'llave-maestra-modaglobal-2026';
        const decoded = jwt.verify(token, secret) as TokenPayload;
        
        const userId = decoded.id_usuario || decoded.id || '';

        req.user = {
            id: userId,
            rol: decoded.rol,
            tienda_id: decoded.id_tienda
        };

        req.headers['x-user-id'] = userId;
        req.headers['x-user-rol'] = decoded.rol;
        req.headers['x-user-tienda-id'] = decoded.id_tienda || ''; 

        next();
    } catch (error) {
        // ✨ MAGIA AQUÍ ✨
        // Si el token caducó o no sirve, NO arrojamos error.
        // Solo lo dejamos pasar como si fuera un "Invitado".
        // El microservicio de Productos se encargará de bloquearlo si intenta hacer algo prohibido.
        return next();
    }
};
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        nombre: string;
        rol: string;
        tienda_id?: string;
    };
}

interface TokenPayload {
    id?: string;
    id_usuario?: string;
    nombre: string; 
    rol: string;
    id_tienda?: string;
}

export const validarAccesoGoblal = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    // Sin token = invitado legítimo, pasa sin identidad
    if (!token || token === 'null' || token === 'undefined') {
        return next();
    }

    try {
        if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET no definido");
    }
    const secret = process.env.JWT_SECRET;
        const decoded = jwt.verify(token, secret) as TokenPayload;

        const userId = decoded.id_usuario || decoded.id || '';
        const usernombre = decoded.nombre || '';

        req.user = {
            id: userId,
            nombre: usernombre,
            rol: decoded.rol,
            tienda_id: decoded.id_tienda
        };

        req.headers['x-user-id'] = userId;
        req.headers['x-user-name'] = usernombre;
        req.headers['x-user-rol'] = decoded.rol;
        req.headers['x-user-tienda-id'] = decoded.id_tienda || '';

        next();
    } catch (error: any) {
        // Token expirado: el cliente debe renovarlo, no lo dejamos pasar
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Sesión expirada. Por favor inicia sesión nuevamente.',
                code: 'TOKEN_EXPIRED'
            });
        }
        // Token manipulado o inválido: rechazo directo
        return res.status(401).json({ 
            error: 'Token de autenticación inválido.',
            code: 'TOKEN_INVALID'
        });
    }
};
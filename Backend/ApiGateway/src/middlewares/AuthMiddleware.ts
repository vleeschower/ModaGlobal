import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Definimos qué trae nuestro usuario dentro del Token
export interface AuthRequest extends Request {
    user?: {
        id: string;
        rol: string;
        tienda_id?: string; // <-- ¡NUEVO!
    };
}

export const validarAccesoGoblal = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No se proporcionó un token de sesión.' });
    }

    try {
        const secret = process.env.JWT_SECRET || 'llave-maestra-modaglobal-2026';
        const decoded = jwt.verify(token, secret) as any;

        // Ahora TypeScript sabe que esto es válido gracias a AuthRequest
        req.user = {
            id: decoded.id_usuario,
            rol: decoded.rol,
            tienda_id: decoded.id_tienda // <-- ¡NUEVO!
        };

        next();
    } catch (error) {
        return res.status(403).json({ error: 'Sesión expirada o token inválido.' });
    }
};
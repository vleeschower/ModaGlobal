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

        // 1. Lo guardas en la memoria del Gateway (como ya lo tenías)
        req.user = {
            id: decoded.id_usuario,
            rol: decoded.rol,
            tienda_id: decoded.id_tienda 
        };

        // 2. ✨ EL TRUCO MAGISTRAL: Lo metes en los Headers de la petición
        // Así, cuando el Proxy reenvíe la petición al microservicio, viajarán en el "sobre".
        req.headers['x-user-id'] = decoded.id_usuario;
        req.headers['x-user-rol'] = decoded.rol;
        req.headers['x-user-tienda-id'] = decoded.id_tienda || ''; // El string vacío protege a los SuperAdmins

        next();
    } catch (error) {
        return res.status(403).json({ error: 'Sesión expirada o token inválido.' });
    }
};
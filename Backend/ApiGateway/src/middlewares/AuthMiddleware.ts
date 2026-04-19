import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 1. Definimos qué trae nuestro usuario dentro del Token para Express
export interface AuthRequest extends Request {
    user?: {
        id: string;
        rol: string;
        tienda_id?: string; // Fundamental para el retail omnicanal
    };
}

// 2. NUEVO: Tipamos el contenido esperado del JWT para evitar usar 'any'
interface TokenPayload {
    id?: string;
    id_usuario?: string;
    rol: string;
    id_tienda?: string;
}

export const validarAccesoGoblal = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No se proporcionó un token de sesión.' });
    }

    try {
        const secret = process.env.JWT_SECRET || 'llave-maestra-modaglobal-2026';
        
        // Decodificamos usando nuestra interfaz segura
        const decoded = jwt.verify(token, secret) as TokenPayload;


        // Ahora TypeScript sabe que esto es válido gracias a AuthRequest

        // Normalizamos el ID por si en el token de origen viene como 'id' o 'id_usuario'
        const userId = decoded.id_usuario || decoded.id || '';

        // Paso A: Lo guardamos en la memoria local de Express (req.user)

        req.user = {
            id: userId,
            rol: decoded.rol,

            tienda_id: decoded.id_tienda // <-- ¡NUEVO!
        };

        // Paso B: ✨ EL TRUCO MAGISTRAL (Inyección de Headers)
        // Sobreescribimos los headers de la petición original. Cuando el middleware proxy 
        // intercepte esta petición, estos datos ya viajarán en el "sobre" hacia los microservicios.
        req.headers['x-user-id'] = userId;
        req.headers['x-user-rol'] = decoded.rol;
        
        // El string vacío protege el header en caso de ser un SuperAdmin que no pertenece a una tienda física
        req.headers['x-user-tienda-id'] = decoded.id_tienda || ''; 


        next();
    } catch (error) {
        return res.status(403).json({ error: 'Sesión expirada o token inválido.' });
    }
};
import express, { Application } from 'express';
import cors from 'cors';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { ClientRequest } from 'http'; // Importado para mejorar el tipado de proxyReq

import { validarAccesoGoblal, AuthRequest } from './middlewares/AuthMiddleware';

// 1. SIEMPRE CONFIGURAR DOTENV AL PRINCIPIO
dotenv.config();

const app: Application = express();
const PORT: number | string = process.env.PORT || 3000;

// Habilitar CORS
app.use(cors());

// ==========================================================
// 2. FUNCIONES AUXILIARES Y MIDDLEWARES GLOBALES
// ==========================================================

// Función para configurar los headers de seguridad para CUALQUIER microservicio
const configurarHeadersSeguridad = (proxyReq: ClientRequest, req: AuthRequest) => {
    const internalKey = process.env.INTERNAL_API_KEY || 'clave-secreta-interna-modaglobal';
    proxyReq.setHeader('x-api-key', internalKey);

    if (req.user) {
        proxyReq.setHeader('x-user-id', req.user.id);
        proxyReq.setHeader('x-user-rol', req.user.rol);
        
        // Propagamos la tienda al microservicio destino
        if (req.user.tienda_id) {
            proxyReq.setHeader('x-user-tienda-id', req.user.tienda_id);
        }
    }
};

// Definimos la política de bloqueo
const limitadorSeguridad = rateLimit({
    windowMs: 1 * 60 * 1000, // Ventana de 1 minuto
    max: 10, // Límite de 10 peticiones por minuto 
    standardHeaders: true, // Devuelve información de límite en los headers
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`Bloqueo por exceso de peticiones: IP ${req.ip}`); 
        res.status(429).json({
            error: 'Demasiadas peticiones. Por seguridad, su acceso ha sido restringido por 5 minutos.'
        });
    },
    // Para que el bloqueo dure 5 minutos tras el exceso:
    skipSuccessfulRequests: false, 
});

// ==========================================================
// 3. CONFIGURACIÓN DE PROXYS
// ==========================================================

const inventarioProxyOptions: Options = {
    target: 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: { '^/api/inventario': '' },
    on: {
        proxyReq: (proxyReq, req, _res) => configurarHeadersSeguridad(proxyReq as ClientRequest, req as AuthRequest)
    }
};

const productoProxyOptions: Options = {
    target: 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: { '^/api/productos': '' },
    on: {
        proxyReq: (proxyReq, req, _res) => configurarHeadersSeguridad(proxyReq as ClientRequest, req as AuthRequest)
    }
};

const usuarioProxyOptions: Options = {
    target: 'http://localhost:3022',
    changeOrigin: true,
    pathRewrite: { '^/api/usuarios': '' },
    on: {
        proxyReq: (proxyReq, req, _res) => configurarHeadersSeguridad(proxyReq as ClientRequest, req as AuthRequest)
    }
};

// ==========================================================
// 4. ASIGNACIÓN DE RUTAS
// ==========================================================

// --- A. Rutas Públicas (SIN validar token) ---
// Se aplica el limitador y luego se envía al proxy correspondiente
app.post('/api/usuarios/login', limitadorSeguridad, createProxyMiddleware(usuarioProxyOptions));
app.post('/api/usuarios/register', limitadorSeguridad, createProxyMiddleware(usuarioProxyOptions));

// --- B. Rate Limits para Mutaciones Específicas ---
// IMPORTANTE: Deben ir ANTES de las rutas generales (app.use).
// Como el limitador llama a next() si todo está bien, la petición continuará hacia el proxy general de abajo.
app.post('/api/productos/nuevo', limitadorSeguridad);
app.post('/api/productos/promociones', limitadorSeguridad);
app.post('/api/productos/proveedores/vincular', limitadorSeguridad);
app.post('/api/productos/resenas', limitadorSeguridad); // Reseñas agrupadas aquí
app.delete('/api/productos/:id', limitadorSeguridad);   // Protege cualquier borrado

// --- C. Rutas Privadas Generales (Validadas con JWT) ---
// Todas las peticiones llegan aquí. Se validan con el JWT y se envían a su microservicio.
app.use('/api/usuarios', validarAccesoGoblal, createProxyMiddleware(usuarioProxyOptions));
app.use('/api/inventario', validarAccesoGoblal, createProxyMiddleware(inventarioProxyOptions));
app.use('/api/productos', validarAccesoGoblal, createProxyMiddleware(productoProxyOptions));

// Rutas futuras (Sigue el mismo patrón para cuando agreguen más módulos del retail)
// app.use('/api/ventas', validarAccesoGoblal, createProxyMiddleware(ventasProxyOptions));

// ==========================================================
// 5. INICIO DEL SERVIDOR
// ==========================================================

app.listen(PORT, () => {
    console.log(`[API Gateway] Fortaleza iniciada en puerto ${PORT}`);
    console.log(`[Seguridad] Llave interna cargada: ${process.env.INTERNAL_API_KEY ? 'SÍ' : 'NO'}`);
});
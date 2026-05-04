import express, { Application } from 'express';
import cors from 'cors';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { ClientRequest } from 'http'; 

import { validarAccesoGoblal, AuthRequest } from './middlewares/AuthMiddleware';

dotenv.config();

const app: Application = express();
const PORT: number | string = process.env.PORT || 3000;

app.use(cors());

// ==========================================================
// 1. HEADER DE SEGURIDAD INTERNA
// ==========================================================
const configurarHeadersSeguridad = (proxyReq: ClientRequest, req: AuthRequest) => {
    const internalKey = process.env.INTERNAL_API_KEY || 'clave-secreta-interna-modaglobal';
    proxyReq.setHeader('x-api-key', internalKey);

    if (req.user) {
        proxyReq.setHeader('x-user-id', req.user.id);
        proxyReq.setHeader('x-user-rol', req.user.rol);
        if (req.user.tienda_id) {
            proxyReq.setHeader('x-user-tienda-id', req.user.tienda_id);
        }
    }
};

const limitadorSeguridad = rateLimit({
    windowMs: 1 * 60 * 1000, 
    max: 10, 
    standardHeaders: true, 
    legacyHeaders: false,
    handler: (req, res) => {
        console.warn(`Bloqueo por exceso de peticiones: IP ${req.ip}`); 
        res.status(429).json({ error: 'Demasiadas peticiones. Acceso restringido por 5 minutos.' });
    },
    skipSuccessfulRequests: false, 
});

// ==========================================================
// 2. CONFIGURACIÓN DE PROXYS
// ==========================================================
const inventarioProxyOptions: Options = {
    target: 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: { '^/api/inventario': '' },
    on: { proxyReq: (proxyReq, req, _res) => configurarHeadersSeguridad(proxyReq as ClientRequest, req as AuthRequest) }
};

const productoProxyOptions: Options = {
    target: 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: { '^/api/productos': '' },
    on: { proxyReq: (proxyReq, req, _res) => configurarHeadersSeguridad(proxyReq as ClientRequest, req as AuthRequest) }
};

const usuarioProxyOptions: Options = {
    target: 'http://localhost:3022',
    changeOrigin: true,
    pathRewrite: { '^/api/usuarios': '' },
    on: { proxyReq: (proxyReq, req, _res) => configurarHeadersSeguridad(proxyReq as ClientRequest, req as AuthRequest) }
};

const ventaProxyOptions: Options = {
    target: 'http://localhost:3003',
    changeOrigin: true,
    pathRewrite: { '^/api/ventas': '' },
    on: { proxyReq: (proxyReq, req, _res) => configurarHeadersSeguridad(proxyReq as ClientRequest, req as AuthRequest) }
};

const carritoProxyOptions: Options = {
    target: 'http://localhost:3003',
    changeOrigin: true,
    on: { proxyReq: (proxyReq, req, _res) => configurarHeadersSeguridad(proxyReq as ClientRequest, req as AuthRequest) }
};

// 👇 NUEVO: Creamos el proxy para los pagos, apuntando al VentasService (3003)
const pagoProxyOptions: Options = {
    target: 'http://localhost:3003',
    changeOrigin: true,
    on: { proxyReq: (proxyReq, req, _res) => configurarHeadersSeguridad(proxyReq as ClientRequest, req as AuthRequest) }
};

// ==========================================================
// 3. ASIGNACIÓN DE RUTAS
// ==========================================================

// A. Rutas públicas (Login/Register)
app.post('/api/usuarios/login', limitadorSeguridad, createProxyMiddleware(usuarioProxyOptions));
app.post('/api/usuarios/register', limitadorSeguridad, createProxyMiddleware(usuarioProxyOptions));

// B. Rate Limits para Mutaciones (Protección contra SPAM)
app.post('/api/productos/admin/producto/nuevo', limitadorSeguridad); 
app.put('/api/productos/admin/producto/editar/:id', limitadorSeguridad); 
app.post('/api/productos/promociones', limitadorSeguridad);
app.post('/api/productos/proveedores/vincular', limitadorSeguridad);
app.post('/api/productos/resenas', limitadorSeguridad);
app.delete('/api/productos/:id', limitadorSeguridad);

// C. ENRUTADOR MAESTRO OMNICANAL
app.use('/api/usuarios', validarAccesoGoblal, createProxyMiddleware(usuarioProxyOptions));
app.use('/api/venta', validarAccesoGoblal, createProxyMiddleware(ventaProxyOptions));
app.use('/api/productos', validarAccesoGoblal, createProxyMiddleware(productoProxyOptions));

// Ruta principal del carrito protegida con rate limit
app.use('/api/carrito', limitadorSeguridad, validarAccesoGoblal, createProxyMiddleware(carritoProxyOptions));

// 👇 NUEVO: Activamos la ruta de pagos en el Gateway
app.use('/api/pagos', validarAccesoGoblal, createProxyMiddleware(pagoProxyOptions));

// ==========================================================
// 4. INICIO DEL SERVIDOR
// ==========================================================
app.listen(PORT, () => {
    console.log(`[API Gateway] Fortaleza iniciada en puerto ${PORT}`);
});
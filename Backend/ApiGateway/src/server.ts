import express, { Application } from 'express';
import cors from 'cors';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { validarAccesoGoblal } from './middlewares/AuthMiddleware';
import { AuthRequest } from './middlewares/AuthMiddleware';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// 1. SIEMPRE CONFIGURAR DOTENV AL PRINCIPIO
dotenv.config();

const app: Application = express();
const PORT: number | string = process.env.PORT || 3000;

// Habilitar CORS
app.use(cors());

// --- FUNCIÓN AUXILIAR PARA EVITAR REPETIR CÓDIGO (DRY) ---
// Esta función configura los headers de seguridad para CUALQUIER microservicio
const configurarHeadersSeguridad = (proxyReq: any, req: AuthRequest) => {
    const internalKey = process.env.INTERNAL_API_KEY || 'clave-secreta-interna-modaglobal';
    proxyReq.setHeader('x-api-key', internalKey);

    if (req.user) {
        proxyReq.setHeader('x-user-id', req.user.id);
        proxyReq.setHeader('x-user-rol', req.user.rol);
        
        // <-- ¡NUEVO! Propagamos la tienda al microservicio destino
        if (req.user.tienda_id) {
            proxyReq.setHeader('x-user-tienda-id', req.user.tienda_id);
        }
    }
};

// --- CONFIGURACIÓN DE PROXYS ---

// 1. Inventarios
const inventarioProxyOptions: Options = {
    target: 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: { '^/api/inventario': '' },
    on: {
        // Usamos una función anónima para forzar el tipo que el proxy espera
        proxyReq: (proxyReq, req, res) => configurarHeadersSeguridad(proxyReq, req as AuthRequest)
    }
};

// 2. Productos
const productoProxyOptions: Options = {
    target: 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: { '^/api/productos': '' },
    on: {
        // Hacemos lo mismo aquí
        proxyReq: (proxyReq, req, res) => configurarHeadersSeguridad(proxyReq, req as AuthRequest)
    }
};

// Definimos la política de bloqueo
const limitadorSeguridad = rateLimit({
    windowMs: 1 * 60 * 1000, // Ventana de 1 minuto
    max: 5, // Límite de 5 peticiones por minuto 
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


// --- ASIGNACIÓN DE RUTAS ---

// 1. PRIMERO: Aplicamos el Rate Limit SOLO a las rutas sensibles (mutaciones)
// Esto está perfecto. Fíjate que le pasamos el limitador como si fuera un middleware.
app.use('/api/productos/nuevo', limitadorSeguridad);
app.use('/api/productos/promociones', limitadorSeguridad);
app.use('/api/productos/proveedores/vincular', limitadorSeguridad);
app.use('/api/productos/resenas', limitadorSeguridad); // Buena idea limitar la creación de reseñas para evitar SPAM

// BORRA ESTAS LÍNEAS (Eran el problema):
// app.get('/api/productos/'); 
// app.get('/api/productos/:id/resenas'); 
// app.post('/api/productos/resenas'); 
// app.get('/api/productos/:id'); 


// 2. SEGUNDO: El Proxy General
// El proxy atrapa TODO lo que empiece con /api/productos y lo manda al microservicio.
// Por ejemplo: Si el front pide GET /api/productos/123, el proxy lo agarra y
// lo manda como GET /123 al microservicio en el puerto 3002.
app.use('/api/inventario', validarAccesoGoblal, createProxyMiddleware(inventarioProxyOptions));
app.use('/api/productos', validarAccesoGoblal, createProxyMiddleware(productoProxyOptions));

app.listen(PORT, () => {
    console.log(`[API Gateway] Fortaleza iniciada en puerto ${PORT}`);
    console.log(`[Seguridad] Llave interna cargada: ${process.env.INTERNAL_API_KEY ? 'SÍ' : 'NO'}`);
});
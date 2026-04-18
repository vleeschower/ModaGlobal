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

//3. Usuarios
const usuarioProxyOptions: Options = {
    target: 'http://localhost:3022',
    changeOrigin: true,
    pathRewrite: { '^/api/usuarios': '' },
    on: {
        proxyReq: (proxyReq, req, res) => configurarHeadersSeguridad(proxyReq, req as AuthRequest)
    }
};

// --- ASIGNACIÓN DE RUTAS ---

// Login y Register - SIN validar token
app.post('/api/usuarios/login', limitadorSeguridad, createProxyMiddleware(usuarioProxyOptions));
app.post('/api/usuarios/register', limitadorSeguridad, createProxyMiddleware(usuarioProxyOptions));

//Aplicamos el Rate Limit SOLO a las rutas sensibles (mutaciones)
// Como el limitador llama a next() si todo está bien, la petición continuará su camino.
app.post('/api/productos/nuevo', limitadorSeguridad);
app.post('/api/productos/promociones', limitadorSeguridad);
app.post('/api/productos/proveedores/vincular', limitadorSeguridad);
app.delete('/api/productos/:id', limitadorSeguridad); // Protege cualquier borrado

// Todas las peticiones (hayan pasado por el limitador o no) llegan aquí.
// Se validan con el JWT y se envían a su microservicio correspondiente.
app.use('/api/usuarios', validarAccesoGoblal, createProxyMiddleware(usuarioProxyOptions));
app.use('/api/inventario', validarAccesoGoblal, createProxyMiddleware(inventarioProxyOptions));
app.use('/api/productos', validarAccesoGoblal, createProxyMiddleware(productoProxyOptions));

// Rutas futuras (Sigue el mismo patrón)
// app.use('/api/ventas', validarAccesoGoblal, ...);

// Esto está perfecto. Fíjate que le pasamos el limitador como si fuera un middleware.
app.use('/api/productos/nuevo', limitadorSeguridad);
app.use('/api/productos/promociones', limitadorSeguridad);
app.use('/api/productos/proveedores/vincular', limitadorSeguridad);
app.use('/api/productos/resenas', limitadorSeguridad); // Buena idea limitar la creación de reseñas para evitar SPAM


app.listen(PORT, () => {
    console.log(`[API Gateway] Fortaleza iniciada en puerto ${PORT}`);
    console.log(`[Seguridad] Llave interna cargada: ${process.env.INTERNAL_API_KEY ? 'SÍ' : 'NO'}`);
});
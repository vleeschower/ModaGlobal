import express, { Application } from 'express';
import cors from 'cors';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';

const app: Application = express();
const PORT: number | string = process.env.PORT || 3000;

// Habilitar CORS para que los Frontends (React/Móvil) puedan hacer peticiones
app.use(cors());

// --- CONFIGURACIÓN DE PROXYS ---

// 1. Proxy para el Microservicio de Inventarios
const inventarioProxyOptions: Options = {
    target: 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: {
        '^/api/inventario': '', // Quita el /api/inventario de la URL antes de enviarla
    },
    on: {
        proxyReq: (proxyReq, req, res) => {
            // Inyectamos la llave secreta que requiere el middleware de seguridad del microservicio
            proxyReq.setHeader('x-api-key', 'clave-secreta-interna-modaglobal');
        }
    }
};

// 2. Proxy para el Microservicio de Usuarios
const usuariosProxyOptions: Options = {
    target: 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: {
        '^/api/usuarios': '', 
    },
    on: {
        proxyReq: (proxyReq, req, res) => {
            // El Gateway inyecta la llave secreta que requiere el microservicio
            proxyReq.setHeader('x-api-key', 'clave-secreta-interna-modaglobal');
        }
    }
};

// Asignar la ruta al proxy
app.use('/api/usuarios', createProxyMiddleware(usuariosProxyOptions));
app.use('/api/inventario', createProxyMiddleware(inventarioProxyOptions));

// app.use('/api/productos', createProxyMiddleware({ target: 'http://localhost:3003', ... }));
// app.use('/api/ventas', createProxyMiddleware({ target: 'http://localhost:3004', ... }));

app.listen(PORT, () => {
    console.log(`[API Gateway] Iniciado y orquestando tráfico en el puerto ${PORT}`);
    console.log(`[API Gateway] Rutas disponibles:`);
    console.log(`  - /api/usuarios -> http://localhost:3002`);
    console.log(`  - /api/inventario -> http://localhost:3001`);
});
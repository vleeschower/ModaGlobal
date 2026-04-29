// src/app.ts
import express from 'express';
import cors from 'cors';
import ventasRoutes from './routes/ventas.routes';
import carritoRoutes from './routes/carrito.routes';

const app = express();

app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Montamos las rutas de ventas
app.use('/', ventasRoutes);
app.use('/api/carrito', carritoRoutes);

export default app;
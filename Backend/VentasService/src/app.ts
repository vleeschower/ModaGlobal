// src/app.ts
import express from 'express';
import cors from 'cors';
import ventasRoutes from './routes/ventas.routes';

const app = express();

app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// Montamos las rutas de ventas
app.use('/', ventasRoutes);

export default app;
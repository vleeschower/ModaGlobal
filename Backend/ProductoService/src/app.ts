// src/app.ts
import express from 'express';
import cors from 'cors';
import productRoutes from './routes/ProductoRoutes';

const app = express();

app.use(cors());
app.use(express.json()); // Necesario para leer el req.body

app.use('/', productRoutes);

export default app;
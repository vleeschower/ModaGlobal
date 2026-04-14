import express, { Application } from 'express';
import inventarioRoutes from './routes/InventarioRoutes';

const app: Application = express();

app.use(express.json());

// Inyectar las rutas
app.use('/', inventarioRoutes);

export default app;
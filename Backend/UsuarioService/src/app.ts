import express, { Application } from 'express';
import usuarioRoutes from './routes/UsuarioRoutes';

const app: Application = express();

// Middleware para parsear JSON
app.use(express.json());

app.use('/', usuarioRoutes);

export default app;
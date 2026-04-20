// src/server.ts
import express from 'express';
import cors from 'cors';
import ventasRoutes from './routes/ventas.routes';

const app = express();
const port = process.env.PORT || 3003;

// Middlewares
app.use(cors()); // Permite peticiones de React
app.use(express.json()); // Permite a Express entender JSON (los datos que mandas en un POST)

// Rutas
app.use('/api/ventas', ventasRoutes);

// Iniciar servidor
app.listen(port, () => {
  console.log(` Microservicio de Ventas corriendo en http://localhost:${port}`);
});
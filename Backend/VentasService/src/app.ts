// src/app.ts
import express from 'express';
import cors from 'cors';
import ventasRoutes from './routes/ventas.routes';
import carritoRoutes from './routes/carrito.routes';
import pagosRoutes from './routes/pagos.routes';

const app = express();

app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// (Puedes borrar el sniffer si quieres, ya hizo su trabajo histórico)
app.use('/', pagosRoutes);

// EL CARRITO AHORA ESCUCHA EN LA RAÍZ (Atrapará /sync, /item y /)
app.use('/', carritoRoutes);

// VENTAS AL FINAL (Atrapará todo lo demás)
app.use('/', ventasRoutes);


export default app;
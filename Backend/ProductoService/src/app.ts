// app.ts
import express from 'express';
import cors from 'cors';
import routes from './routes/ProductoRoutes';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' })); // Protección DoS aquí
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use('/', routes);

export default app;
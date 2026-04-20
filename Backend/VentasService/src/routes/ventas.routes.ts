// src/routes/ventas.routes.ts
import { Router } from 'express';
import { getVentas, createVenta, actualizarEstado } from '../controllers/ventas.controller';

const router = Router();

// Rutas base: http://localhost:3003/api/ventas
router.get('/', getVentas);
router.post('/', createVenta);

// Ruta para actualizar estado: PATCH http://localhost:3003/api/ventas/VTA-XXXXX/estado
router.patch('/:id_venta/estado', actualizarEstado);

export default router;
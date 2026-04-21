import { Router } from 'express';
import { getVentas, createVenta, actualizarEstado } from '../controllers/ventas.controller';

const router = Router();

// Rutas base
router.get('/', getVentas);
router.post('/', createVenta);

// Ruta para actualizar estado (La que hicimos hoy)
router.patch('/:id_venta/estado', actualizarEstado);

export default router;
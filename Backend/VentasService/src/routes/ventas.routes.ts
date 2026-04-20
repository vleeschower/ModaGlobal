// src/routes/ventas.routes.ts
import { Router } from 'express';
import { verificarAccesoInterno, verificarRol } from '../middlewares/Security';
import { getVentas, createVenta, actualizarEstado } from '../controllers/ventas.controller';

const router = Router();

// ==========================================
// 1. SEGURIDAD BASE (Aplica a todas las rutas)
// ==========================================
router.use(verificarAccesoInterno);

// Rutas base: http://localhost:3003/api/ventas
router.get('/', getVentas);
router.post('/', verificarRol(['Cajero', 'Administrador']), createVenta);

// Ruta para actualizar estado: PATCH http://localhost:3003/api/ventas/VTA-XXXXX/estado
router.patch('/:id_venta/estado', verificarRol(['Cajero', 'Administrador']), actualizarEstado);

export default router;
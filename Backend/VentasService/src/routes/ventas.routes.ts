import { Router } from 'express';
import { verificarAccesoInterno, verificarRol } from '../middlewares/Security';
import { getVentas, createVenta, actualizarEstado } from '../controllers/ventas.controller';

const router = Router();

// ==========================================
// 1. SEGURIDAD DE MICROSERVICIO
// ==========================================
// Esto asegura que nadie se salte el ApiGateway para pegarle directo a la IP de la base de datos
router.use(verificarAccesoInterno);

// ==========================================
// 2. DEFINICIÓN DE RUTAS
// ==========================================

// Obtener historial: Solo Staff puede ver todas las ventas
router.get('/', verificarRol(['Cajero', 'Administrador', 'SuperAdministrador']), getVentas);

// Crear venta: 
// IMPORTANTE: Si es Venta en Línea, el Cliente necesita permiso. 
// Si es Venta Local, el Cajero la crea. 
router.post('/', verificarRol(['Cliente', 'Cajero', 'Administrador']), createVenta);

// Actualizar estado de entrega (PATCH): 
// Esta es la que hicimos hoy, solo el Staff de tienda puede marcar como "Entregado"
router.patch('/:id_venta/estado', verificarRol(['Cajero', 'Administrador']), actualizarEstado);

export default router;
import { Router } from 'express';
import { verificarAccesoInterno, verificarRol } from '../middlewares/Security';
import { getVentas, createVenta, actualizarEstado, buscarPorCodigoRecoleccion, confirmarEntregaLocal, procesarVentaFisica } from '../controllers/ventas.controller';

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
router.get('/codigo/:codigo', verificarRol(['Cajero', 'Administrador', 'SuperAdministrador']), buscarPorCodigoRecoleccion);
router.post('/:id_venta/entregar', verificarRol(['Cajero', 'Administrador', 'SuperAdministrador']), confirmarEntregaLocal);

// Crear venta: 
// IMPORTANTE: Si es Venta en Línea, el Cliente necesita permiso. 
// Si es Venta Local, el Cajero la crea. 
router.post('/', verificarRol(['Cliente', 'Cajero', 'Administrador']), createVenta);
// ✨ NUEVA RUTA EXCLUSIVA PARA EL PUNTO DE VENTA
router.post('/local', verificarRol(['Cajero', 'Administrador', 'SuperAdministrador']), procesarVentaFisica);

// Actualizar estado de entrega (PATCH): 
// Esta es la que hicimos hoy, solo el Staff de tienda puede marcar como "Entregado"
router.patch('/:id_venta/estado', verificarRol(['Cajero', 'Administrador']), actualizarEstado);

export default router;
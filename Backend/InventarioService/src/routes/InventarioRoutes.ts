import { Router } from 'express';
import { consultarStock, ajustarStock, crearTienda } from '../controllers/InventarioController';
import { verificarAccesoInterno, verificarRol } from '../middlewares/Security';
import { obtenerTiendas } from '../controllers/InventarioController';

const router = Router();

// ==========================================
// SEGURIDAD PERIMETRAL
// ==========================================
// Obligamos a que TODAS las peticiones vengan del API Gateway
router.use(verificarAccesoInterno);

// ==========================================
// RUTAS PÚBLICAS (Para usuarios logueados)
// ==========================================
// Un cliente normal debe poder ver si hay stock en su tienda local para comprar
router.get('/stock/:id_producto', consultarStock);

// ==========================================
// RUTAS OPERATIVAS / ADMIN
// ==========================================
// Solo los gerentes y personal de almacén pueden ingresar o dar de baja mercancía
router.post('/movimientos', verificarRol(['Admin', 'SuperAdmin']), ajustarStock);

// Solo la alta gerencia puede abrir nuevas sucursales físicas/bodegas
router.post('/tiendas', verificarRol(['SuperAdmin']), crearTienda);

// Ruta para obtener tiendas (solo admins)
router.get('/tiendas', verificarRol(['SuperAdministrador', 'Administrador']), obtenerTiendas);

export default router;
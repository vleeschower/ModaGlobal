import { Router } from 'express';
import { 
    consultarStock, 
    ajustarStock, 
    crearTienda, 
    solicitarStock, 
    obtenerSolicitudes, 
    responderSolicitud, 
    obtenerTodasTiendas,
    obtenerTiendasPublicas
} from '../controllers/InventarioController';
import { verificarAccesoInterno, verificarRol, verificarApiKey } from '../middlewares/Security';

const router = Router();

// ==========================================
// 1. SEGURIDAD ZERO TRUST (Aplica a TODAS las rutas)
// ==========================================
router.use(verificarApiKey);

// ==========================================
// 2. RUTAS PÚBLICAS (Deben ir ANTES de verificarAccesoInterno)
// ==========================================

router.get('/publicas', obtenerTiendasPublicas);
// Invitados y clientes pueden ver si hay stock de un producto
router.get('/stock/:id_producto', consultarStock);

// ==========================================
// 3. BARRERA DE SESIÓN (A partir de aquí, exige Token JWT)
// ==========================================
router.use(verificarAccesoInterno);


// ==========================================
// 4. RUTAS PRIVADAS ESTÁTICAS (SuperAdmin / Admin)
// ==========================================

// SUCURSALES (Usamos solo la versión paginada)
router.get('/tiendas', verificarRol(['SuperAdministrador', 'Administrador']), obtenerTodasTiendas);
router.post('/tiendas', verificarRol(['SuperAdministrador']), crearTienda);

// WORKFLOW: SOLICITUDES DE STOCK
router.post('/solicitudes', verificarRol(['Administrador']), solicitarStock);
router.get('/solicitudes', verificarRol(['Administrador', 'SuperAdministrador']), obtenerSolicitudes);

// AJUSTES MANUALES (Mermas, entradas directas)
router.post('/ajustar', verificarRol(['Administrador', 'SuperAdministrador']), ajustarStock);

// ==========================================
// 5. RUTAS PRIVADAS DINÁMICAS (Llevan parámetros como :id)
// ==========================================
// Solo el Súper Admin aprueba o rechaza
router.put('/solicitudes/:id_solicitud/responder', verificarRol(['SuperAdministrador']), responderSolicitud);


export default router;
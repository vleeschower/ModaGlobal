import { Router } from 'express';
import { 
    obtenerProductos,
    obtenerCategorias,
    obtenerPromocionesPublicas,
    obtenerProductoPorId, 
    obtenerResenas,
    crearResena,
    obtenerProductosAdmin,       
    obtenerPromocionesAdmin,
    guardarPromocion,
    crearPromocion,
    vincularProveedor,
    crearProducto, 
    actualizarProducto,
    eliminarProducto
} from '../controllers/ProductoController';
import { verificarAccesoInterno, verificarRol } from '../middlewares/Security';
import { upload } from '../config/Cloudinary';

const router = Router();

// ==========================================
// 1. SEGURIDAD BASE (Aplica a todas las rutas)
// ==========================================
router.use(verificarAccesoInterno);

// ==========================================
// 2. RUTAS PÚBLICAS (Lectura para Clientes)
// ==========================================
router.get('/', obtenerProductos);
router.get('/categorias', obtenerCategorias);
router.get('/ofertas', obtenerPromocionesPublicas);

// ==========================================
// 3. RUTAS PROTEGIDAS GENERALES (Clientes logueados)
// ==========================================
// Aquí asumo que la validación de usuario logueado la hace el Gateway
router.post('/resenas', crearResena);

// ==========================================
// 4. RUTAS DE ADMINISTRACIÓN (Estáticas)
// ⚠️ REGLA DE ORO: Las rutas estáticas SIEMPRE van antes que las dinámicas (/:id)
// ==========================================

// Vistas del Dashboard (SuperAdmin y Admin)
router.get('/admin/lista', verificarRol(['Administrador', 'SuperAdministrador']), obtenerProductosAdmin);
router.get('/promociones/admin', verificarRol(['Administrador', 'SuperAdministrador']), obtenerPromocionesAdmin);

// Operaciones de Sucursal (SuperAdmin y Admin)
router.post('/promociones/admin/guardar', verificarRol(['Administrador', 'SuperAdministrador']), guardarPromocion);
router.post('/promociones', verificarRol(['Administrador', 'SuperAdministrador']), crearPromocion);
router.post('/proveedores/vincular', verificarRol(['Administrador', 'SuperAdministrador']), vincularProveedor);

// Operaciones Maestras de Catálogo (SÓLO SuperAdministrador)
router.post('/nuevo', verificarRol(['SuperAdministrador']), upload.array('imagenes', 5), crearProducto);


// ==========================================
// 5. RUTAS DINÁMICAS (/:id)
// ⚠️ Deben ir al final para no "comerse" a las rutas de arriba
// ==========================================

// Públicas dinámicas
router.get('/:id', obtenerProductoPorId);
router.get('/:id/resenas', obtenerResenas);

// Operaciones Maestras de Catálogo (SÓLO SuperAdministrador)
router.put('/:id', verificarRol(['SuperAdministrador']), upload.array('imagenes', 5), actualizarProducto);
router.delete('/:id', verificarRol(['SuperAdministrador']), eliminarProducto);

export default router;
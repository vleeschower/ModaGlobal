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
    eliminarProducto,
    obtenerInventarioRed
} from '../controllers/ProductoController';
import { verificarApiKey, verificarAccesoInterno, verificarRol } from '../middlewares/Security';
import { upload } from '../config/Cloudinary';

const router = Router();

// ==========================================
// 1. SEGURIDAD ZERO TRUST (Solo valida que venga del API Gateway)
// ==========================================
router.use(verificarApiKey); // ✅ ESTA ES LA CLAVE PARA PERMITIR INVITADOS

// ==========================================
// 2. RUTAS PÚBLICAS (Lectura para Clientes/Invitados)
// ==========================================
router.get('/', obtenerProductos);
router.get('/categorias', obtenerCategorias);
router.get('/ofertas', obtenerPromocionesPublicas);
router.get('/:id', obtenerProductoPorId);
router.get('/:id/resenas', obtenerResenas);

// ==========================================
// 3. BARRERA DE SESIÓN (De aquí hacia abajo, EXIGEN estar logueado)
// ==========================================
router.use(verificarAccesoInterno); 

// ==========================================
// 4. RUTAS PROTEGIDAS GENERALES (Clientes logueados)
// ==========================================
router.post('/resenas', crearResena);

// ==========================================
// 5. RUTAS DE ADMINISTRACIÓN (Estáticas)
// ==========================================
// Vistas del Dashboard
router.get('/admin/lista', verificarRol(['Administrador', 'SuperAdministrador']), obtenerProductosAdmin);
router.get('/promociones/admin', verificarRol(['Administrador', 'SuperAdministrador']), obtenerPromocionesAdmin);
router.get('/inventario/red', verificarRol(['Administrador', 'SuperAdministrador']), obtenerInventarioRed);

// Operaciones de Sucursal
router.post('/promociones/admin/guardar', verificarRol(['Administrador', 'SuperAdministrador']), guardarPromocion);
router.post('/promociones', verificarRol(['Administrador', 'SuperAdministrador']), crearPromocion);
router.post('/proveedores/vincular', verificarRol(['Administrador', 'SuperAdministrador']), vincularProveedor);

// Operaciones Maestras de Catálogo
router.post('/admin/producto/nuevo', verificarRol(['SuperAdministrador']), upload.array('imagenes', 5), crearProducto);
router.put('/admin/producto/editar/:id', verificarRol(['SuperAdministrador']), upload.array('imagenes', 5), actualizarProducto);
router.delete('/:id', verificarRol(['SuperAdministrador']), eliminarProducto);

export default router;
import { Router } from 'express';
import { 
    crearProducto, actualizarProducto, obtenerProductos, obtenerProductoPorId, 
    eliminarProducto, crearResena, obtenerResenas, obtenerCategorias,
    crearPromocion, vincularProveedor,
    obtenerPromocionesAdmin, guardarPromocion, obtenerPromocionesPublicas
} from '../controllers/ProductoController';
import { verificarAccesoInterno, verificarRol } from '../middlewares/Security';
import { upload } from '../config/Cloudinary';

const router = Router();

// 1. Verificamos que venga del API Gateway (Aplica a todas las rutas)
router.use(verificarAccesoInterno);

// ==========================================
// RUTAS PÚBLICAS Y ESTÁTICAS (Siempre arriba)
// ==========================================
router.get('/', obtenerProductos);
router.get('/categorias', obtenerCategorias);
router.get('/ofertas', obtenerPromocionesPublicas); 

// ==========================================
// RUTAS DE ADMINISTRACIÓN (Estáticas)
// ==========================================
// ✨ CORRECCIÓN: Usamos 'Administrador' y 'SuperAdministrador' completos
router.get('/promociones/admin', verificarRol(['Administrador', 'SuperAdministrador']), obtenerPromocionesAdmin);
router.post('/promociones/admin/guardar', verificarRol(['Administrador', 'SuperAdministrador']), guardarPromocion);

router.post('/promociones', verificarRol(['Administrador', 'SuperAdministrador']), crearPromocion);
router.post('/proveedores/vincular', verificarRol(['Administrador', 'SuperAdministrador']), vincularProveedor);
router.post('/nuevo', verificarRol(['Administrador', 'SuperAdministrador']), upload.array('imagenes', 5), crearProducto);
router.post('/resenas', crearResena); 

// ==========================================
// RUTAS DINÁMICAS (Siempre al final, porque usan /:id)
// ==========================================
router.get('/:id', obtenerProductoPorId);
router.get('/:id/resenas', obtenerResenas);
router.put('/:id', verificarRol(['Administrador', 'SuperAdministrador']), upload.array('imagenes', 5), actualizarProducto);
router.delete('/:id', verificarRol(['Administrador', 'SuperAdministrador']), eliminarProducto);

export default router;
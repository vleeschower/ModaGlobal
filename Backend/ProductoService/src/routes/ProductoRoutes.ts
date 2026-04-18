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
router.get('/ofertas', obtenerPromocionesPublicas); // Público

// ==========================================
// RUTAS DE ADMINISTRACIÓN (Estáticas)
// ==========================================
// ✨ AQUÍ CORREGIMOS LA RUTA PARA QUE COINCIDA CON EL FRONTEND
router.get('/promociones/admin', verificarRol(['Admin', 'SuperAdmin']), obtenerPromocionesAdmin);
router.post('/promociones/admin/guardar', verificarRol(['Admin', 'SuperAdmin']), guardarPromocion);

router.post('/promociones', verificarRol(['Admin', 'SuperAdmin']), crearPromocion);
router.post('/proveedores/vincular', verificarRol(['Admin', 'SuperAdmin']), vincularProveedor);
router.post('/nuevo', verificarRol(['Admin', 'SuperAdmin']), upload.array('imagenes', 5), crearProducto);
router.post('/resenas', crearResena); // Asumiendo que la validación de auth la haces en el controlador

// ==========================================
// RUTAS DINÁMICAS (Siempre al final, porque usan /:id)
// ==========================================
router.get('/:id', obtenerProductoPorId);
router.get('/:id/resenas', obtenerResenas);
router.put('/:id', verificarRol(['Admin', 'SuperAdmin']), upload.array('imagenes', 5), actualizarProducto);
router.delete('/:id', verificarRol(['Admin', 'SuperAdmin']), eliminarProducto);

export default router;
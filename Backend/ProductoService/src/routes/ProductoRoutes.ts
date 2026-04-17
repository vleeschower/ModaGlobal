import { Router } from 'express';
import { 
    crearProducto, 
    actualizarProducto,
    obtenerProductos,
    obtenerProductoPorId, 
    eliminarProducto,
    crearResena,
    obtenerResenas,
    obtenerCategorias,
    crearPromocion,
    vincularProveedor
} from '../controllers/ProductoController';
import { verificarAccesoInterno, verificarRol } from '../middlewares/Security';
import { upload } from '../config/Cloudinary';

const router = Router();

// 1. Verificamos que venga del API Gateway (Aplica a todas las rutas)
router.use(verificarAccesoInterno);

// ==========================================
// RUTAS PÚBLICAS (Cualquier usuario logueado)
// ==========================================
router.get('/', obtenerProductos);
router.get('/categorias', obtenerCategorias);
router.get('/:id', obtenerProductoPorId);
router.get('/:id/resenas', obtenerResenas);

// --- RUTAS PROTEGIDAS (Usuarios logueados) ---
// Aquí podrías agregar un middleware 'verificarAuth' 
router.post('/resenas', crearResena);

// ==========================================
// RUTAS DE ADMINISTRACIÓN (Operaciones diarias)
// ==========================================
//agregar un producto nuevo (POST)
router.post('/nuevo', verificarRol(['Admin', 'SuperAdmin']), upload.array('imagenes', 5), crearProducto);
// 🆕 Editar Producto Completo (PUT)
router.put('/:id', verificarRol(['Admin', 'SuperAdmin']), upload.array('imagenes', 5), actualizarProducto);
// 🆕 Eliminar Producto (DELETE)
router.delete('/:id', verificarRol(['Admin']), eliminarProducto);
router.post('/promociones', verificarRol(['Admin', 'SuperAdmin']), crearPromocion);
router.post('/proveedores/vincular', verificarRol(['Admin', 'SuperAdmin']), vincularProveedor);


export default router;
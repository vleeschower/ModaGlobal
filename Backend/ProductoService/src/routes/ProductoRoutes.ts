import { Router } from 'express';
import { 
    crearProducto, 
<<<<<<< HEAD
    obtenerProductos, 
    eliminarProducto,
=======
    actualizarProducto,
    obtenerProductos,
    obtenerProductoPorId, 
    eliminarProducto,
    crearResena,
    obtenerResenas,
>>>>>>> franco-branch
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
<<<<<<< HEAD
=======
router.get('/:id', obtenerProductoPorId);
router.get('/:id/resenas', obtenerResenas);

// --- RUTAS PROTEGIDAS (Usuarios logueados) ---
// Aquí podrías agregar un middleware 'verificarAuth' 
router.post('/resenas', crearResena);
>>>>>>> franco-branch

// ==========================================
// RUTAS DE ADMINISTRACIÓN (Operaciones diarias)
// ==========================================
<<<<<<< HEAD
router.post('/nuevo', verificarRol(['Admin', 'SuperAdmin']), upload.single('imagen'), crearProducto);
router.post('/promociones', verificarRol(['Admin', 'SuperAdmin']), crearPromocion);
router.post('/proveedores/vincular', verificarRol(['Admin', 'SuperAdmin']), vincularProveedor);
router.delete('/:id', verificarRol(['Admin', 'SuperAdmin']), eliminarProducto);
=======
//agregar un producto nuevo (POST)
router.post('/nuevo', verificarRol(['Admin', 'SuperAdmin']), upload.array('imagenes', 5), crearProducto);
// 🆕 Editar Producto Completo (PUT)
router.put('/:id', verificarRol(['Admin', 'SuperAdmin']), upload.array('imagenes', 5), actualizarProducto);
// 🆕 Eliminar Producto (DELETE)
router.delete('/:id', verificarRol(['Admin']), eliminarProducto);
router.post('/promociones', verificarRol(['Admin', 'SuperAdmin']), crearPromocion);
router.post('/proveedores/vincular', verificarRol(['Admin', 'SuperAdmin']), vincularProveedor);

>>>>>>> franco-branch

export default router;
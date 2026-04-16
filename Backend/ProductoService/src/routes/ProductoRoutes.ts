import { Router } from 'express';
import { 
    crearProducto, 
    obtenerProductos, 
    eliminarProducto,
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

// ==========================================
// RUTAS DE ADMINISTRACIÓN (Operaciones diarias)
// ==========================================
router.post('/nuevo', verificarRol(['Admin', 'SuperAdmin']), upload.single('imagen'), crearProducto);
router.post('/promociones', verificarRol(['Admin', 'SuperAdmin']), crearPromocion);
router.post('/proveedores/vincular', verificarRol(['Admin', 'SuperAdmin']), vincularProveedor);
router.delete('/:id', verificarRol(['Admin', 'SuperAdmin']), eliminarProducto);

export default router;
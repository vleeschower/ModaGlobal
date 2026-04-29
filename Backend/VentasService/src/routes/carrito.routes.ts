// src/routes/carrito.routes.ts
import { Router } from 'express';
import { 
    getCarrito, 
    upsertCarritoItem, 
    syncCarrito, 
    removeFromCarrito, 
    clearCarritoDB 
} from '../controllers/carrito.controller';

// IMPORTANTE: Si tienes un middleware para verificar el JWT del usuario, impórtalo aquí.
// Ejemplo: import { verificarAutenticacion } from '../middlewares/auth';

const router = Router();

// Si tienes el middleware, ponlo aquí para proteger todas las rutas del carrito
// router.use(verificarAutenticacion); 

router.get('/', getCarrito);
router.post('/item', upsertCarritoItem);
router.post('/sync', syncCarrito);
router.delete('/item/:id_producto', removeFromCarrito);
router.delete('/', clearCarritoDB);

export default router;
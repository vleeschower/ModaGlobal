// src/routes/carrito.routes.ts
import { Router } from 'express';
import { 
    getCarrito, 
    upsertCarritoItem, 
    syncCarrito, 
    removeFromCarrito, 
    clearCarritoDB 
} from '../controllers/carrito.controller';

// 👇 1. IMPORTAMOS A TU GUARDIA DE SEGURIDAD PERFECTO
import { verificarAccesoInterno } from '../middlewares/Security';

const router = Router();

// 👇 2. LO ACTIVAMOS PARA QUE ATRAPE TU ID Y PROTEJA EL CARRITO
router.use(verificarAccesoInterno); 

router.get('/', getCarrito);
router.post('/item', upsertCarritoItem);
router.post('/sync', syncCarrito);
router.delete('/item/:id_producto', removeFromCarrito);
router.delete('/', clearCarritoDB);

export default router;
import { Router } from 'express';
import { consultarStock } from '../controllers/InventarioController';
import { verificarAcceso } from '../middlewares/security';

const router = Router();

// Aplicar middleware de seguridad
router.use(verificarAcceso);

// Definir rutas
router.get('/stock/:id_producto', consultarStock);

export default router;
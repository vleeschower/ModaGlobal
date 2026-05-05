import { Router, Request, Response, NextFunction } from 'express';
import { procesarPagoCheckout } from '../controllers/pagos.controller'; // Ajusta la ruta si es necesario

const router = Router();

// Middleware rápido para atrapar el ID del usuario que nos manda tu API Gateway
const extraerUsuarioGateway = (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
        return res.status(401).json({ success: false, message: 'No autorizado. Falta ID de usuario.' });
    }
    
    // Se lo pasamos a la request para que el controlador lo use
    (req as any).usuarioTransaccion = userId;
    next();
};

// Ruta protegida que recibe el POST desde React -> Gateway -> VentasService
// Queda como: POST /api/pagos/checkout
router.post('/checkout', extraerUsuarioGateway, procesarPagoCheckout);

export default router;
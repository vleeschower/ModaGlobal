import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { IProductoInventario } from '../interfaces/InventarioInterface';

// Base de datos simulada con tipado estricto
const inventarioMock: IProductoInventario[] = [
    { id_producto: 'prod-001', id_tienda: 'tienda-01', stock_disponible: 15, stock_reservado: 2 },
    { id_producto: 'prod-001', id_tienda: 'almacen-web', stock_disponible: 5, stock_reservado: 0 },
    { id_producto: 'prod-002', id_tienda: 'tienda-01', stock_disponible: 8, stock_reservado: 1 },
    { id_producto: 'prod-002', id_tienda: 'almacen-web', stock_disponible: 20, stock_reservado: 5 },
    { id_producto: 'prod-003', id_tienda: 'tienda-01', stock_disponible: 0, stock_reservado: 0 },
    { id_producto: 'prod-003', id_tienda: 'almacen-web', stock_disponible: 10, stock_reservado: 3 },
];

export const consultarStock = (req: Request, res: Response): void => {
    try {
        const { id_producto } = req.params;
        logger.info(`Consultando stock para el producto: ${id_producto}`);
        
        const stock: IProductoInventario[] = inventarioMock.filter(item => item.id_producto === id_producto);
        
        if (stock.length === 0) {
            res.status(404).json({ success: false, message: 'Producto no encontrado en inventario' });
            return;
        }

        res.status(200).json({ success: true, data: stock });
    } catch (error) {
        logger.error('Error al consultar el stock', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
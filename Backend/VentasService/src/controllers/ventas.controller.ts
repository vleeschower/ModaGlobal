// src/controllers/ventas.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { actualizarEstadoVenta } from '../services/ventas.service';

const prisma = new PrismaClient();

// Función para obtener todas las ventas
export const getVentas = async (req: Request, res: Response) => {
  try {
    const ventas = await prisma.ventas.findMany({
      include: {
        detalles: true, // Esto hace que también nos traiga los productos de esa venta
      },
    });
    res.json(ventas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las ventas' });
  }
};

// Función para crear una venta "Pendiente"
export const createVenta = async (req: Request, res: Response) => {
  try {
    const { id_usuario, id_tienda, canal, subtotal, impuestos, total, detalles } = req.body;

    // Generamos un ID de venta único (en producción usaríamos un UUID)
    const nuevaVentaId = `VTA-${Date.now()}`;

    const nuevaVenta = await prisma.ventas.create({
      data: {
        id_venta: nuevaVentaId,
        id_usuario,
        id_tienda,
        canal,
        subtotal,
        impuestos,
        total,
        estado: 'PENDIENTE', // Estado inicial
        // Aquí insertamos también el detalle de la venta (los productos)
        detalles: {
          create: detalles.map((item: any, index: number) => ({
            id_detalle: `DET-${Date.now()}-${index}`,
            id_producto: item.id_producto,
            nombre_producto_snapshot: item.nombre_producto,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
          }))
        }
      },
      include: {
        detalles: true,
      }
    });

    res.status(201).json(nuevaVenta);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear la venta' });
  }
};

// Funcion para procesar el pago o cambio de estado
export const actualizarEstado = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extraemos el ID de la venta desde la URL (ej: /api/ventas/VTA-123)
    const { id_venta } = req.params;
    // Extraemos los datos que nos manda el cliente en el JSON
    const { estado_nuevo, modificado_por } = req.body;

    // Validacion de seguridad
    if (!estado_nuevo || !modificado_por) {
      res.status(400).json({ error: "Los campos 'estado_nuevo' y 'modificado_por' son obligatorios." });
      return;
    }

    // Llamamos a la logica de negocio (Tu capa de Servicio)
    const ventaActualizada = await actualizarEstadoVenta(id_venta as string, estado_nuevo, modificado_por);
    // Respondemos con los nuevos datos
    res.json(ventaActualizada);

  } catch (error: any) {
    console.error(error);
    
    // Si el servicio detecta que la venta no existe, mandamos un error 404 (No encontrado)
    if (error.message === 'Venta no encontrada') {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Error interno al actualizar el estado de la venta' });
  }
};
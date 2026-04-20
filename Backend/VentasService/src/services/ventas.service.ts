// src/services/ventas.service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const actualizarEstadoVenta = async (
  id_venta: string, 
  estado_nuevo: string, 
  id_usuario: string
) => {
  // 1. Obtenemos el estado actual de la venta
  const ventaActual = await prisma.ventas.findUnique({
    where: { id_venta }
  });

  if (!ventaActual) {
    throw new Error('Venta no encontrada');
  }

  // 2. Logica de negocio: Generar codigo solo si se esta pagando
  let codigoRecoleccion = ventaActual.codigo_recoleccion;
  if (estado_nuevo === 'PAGADO' && !codigoRecoleccion) {
    codigoRecoleccion = `REC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  // 3. Transaccion: Se ejecutan ambas operaciones o ninguna
  const resultado = await prisma.$transaction(async (tx) => {
    
    // A) Actualizar la tabla de ventas
    const ventaActualizada = await tx.ventas.update({
      where: { id_venta },
      data: {
        estado: estado_nuevo,
        codigo_recoleccion: codigoRecoleccion
      }
    });

    // B) Registrar el movimiento en la tabla de auditoria
    await tx.auditoriaVentas.create({
      data: {
        id_auditoria: `LOG-${Date.now()}`,
        id_venta: id_venta,
        estado_anterior: ventaActual.estado,
        estado_nuevo: estado_nuevo,
        id_usuario: id_usuario
      }
    });

    return ventaActualizada;
  });

  return resultado;
};
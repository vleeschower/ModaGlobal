// src/controllers/ventas.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { actualizarEstadoVenta } from '../services/ventas.service';
import { publicarEventoVenta } from '../events/EventPublisher';

const prisma = new PrismaClient();

// Función para obtener todas las ventas (🔥 AHORA CON FILTRO OMNICANAL PARA EL CAJERO)
export const getVentas = async (req: Request, res: Response) => {
  try {
    const rol_usuario = (req as any).user?.rol;
    const id_tienda_cajero = (req as any).usuarioTiendaId;

    let whereClause: any = {};
    
    // Si NO es SuperAdministrador, forzamos a que solo vea las de su sucursal
    if (rol_usuario && rol_usuario !== 'SuperAdministrador') {
        if (!id_tienda_cajero) {
            return res.status(403).json({ error: 'No tienes una sucursal asignada para ver el historial de ventas.' });
        }
        whereClause.id_tienda = id_tienda_cajero;
    }

    const ventas = await prisma.ventas.findMany({
      where: whereClause,
      include: {
        detalles: true, // Respetamos tu relación original 'detalles'
      },
      orderBy: { id_venta: 'desc' } // Para que salgan las más recientes primero
    });
    
    // Respetamos tu formato de respuesta original para no romper tu frontend
    res.json(ventas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las ventas' });
  }
};

// Función para crear una venta "Pendiente" (Intacta, como la tenías)
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

// Función para procesar el pago o cambio de estado (🔥 BLINDADA PARA ENTREGAS DE CAJERO)
export const actualizarEstado = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extraemos el ID de la venta desde la URL
    const id_venta = req.params.id_venta as string;    // Extraemos los datos que manda el cliente
    const { estado_nuevo, modificado_por, codigo_recoleccion } = req.body;

    // Obtenemos los datos del cajero real a través del token de seguridad
    const id_usuario_cajero = (req as any).usuarioTransaccion || (req as any).user?.id || modificado_por;
    const rol_usuario = (req as any).user?.rol || 'Cajero';
    const id_tienda_cajero = (req as any).usuarioTiendaId;

    // Validación de seguridad
    if (!estado_nuevo || !id_usuario_cajero) {
      res.status(400).json({ error: "Los campos 'estado_nuevo' y 'modificado_por' son obligatorios." });
      return;
    }

    // Buscamos la venta original para hacer las validaciones Omnicanal
    const venta = await prisma.ventas.findUnique({
        where: { id_venta }
    });

    if (!venta) {
        res.status(404).json({ error: 'Venta no encontrada' });
        return;
    }

    // ================================================================
    // 🔥 REGLAS OMNICANAL (SOLO SI SE VA A ENTREGAR EL PEDIDO)
    // ================================================================
    if (estado_nuevo === 'ENTREGADA') {
        
        // a) ¿El pedido pertenece a la tienda del cajero?
        if (rol_usuario !== 'SuperAdministrador' && venta.id_tienda !== id_tienda_cajero) {
            res.status(403).json({ error: 'Este pedido es de otra sucursal. No puedes entregarlo aquí.' });
            return;
        }

        // b) ¿El código de recolección es correcto?
        if (venta.codigo_recoleccion !== codigo_recoleccion) {
            res.status(400).json({ error: 'Código de recolección incorrecto. Verifica el ticket del cliente.' });
            return;
        }

        // c) Procesar la entrega y auditar (Transacción atómica)
        await prisma.$transaction(async (tx) => {
            // Actualizamos la venta
            await tx.ventas.update({
                where: { id_venta },
                data: { estado: 'ENTREGADA' }
            });

            // Dejamos la huella del cajero en la tabla de auditoría (Como lo pediste)
            await tx.auditoriaVentas.create({
                data: {
                    id_auditoria: `LOG-${Date.now()}`,
                    id_venta: id_venta,
                    estado_anterior: venta.estado || 'COMPLETADA',
                    estado_nuevo: 'ENTREGADA',
                    id_usuario: id_usuario_cajero
                }
            });
        });

        // Retornamos la venta actualizada manteniendo tu formato original
        const ventaActualizada = await prisma.ventas.findUnique({ where: { id_venta } });
        res.json(ventaActualizada);
        return;
    }
    // ================================================================

    // Si es otro estado distinto a 'ENTREGADA', usamos tu lógica de negocio original
    const ventaActualizada = await actualizarEstadoVenta(id_venta as string, estado_nuevo, modificado_por);
    res.json(ventaActualizada);

  } catch (error: any) {
    console.error(error);
    
    if (error.message === 'Venta no encontrada') {
      res.status(404).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Error interno al actualizar el estado de la venta' });
  }
};

// ==========================================
// 🛒 1. BUSCAR TICKET POR CÓDIGO DE RECOLECCIÓN
// ==========================================
export const buscarPorCodigoRecoleccion = async (req: Request<{ codigo: string }>, res: Response): Promise<void> => {
    try {
        const { codigo } = req.params; // Ahora TypeScript sabe 100% que esto es un 'string'
        const id_tienda_cajero = (req as any).usuarioTiendaId;
        const rol_usuario = (req as any).user?.rol;

        const venta = await prisma.ventas.findFirst({
            where: { codigo_recoleccion: codigo },
            include: { detalles: true }
        });

        if (!venta) {
            res.status(404).json({ error: 'No se encontró ningún pedido con ese código.' });
            return;
        }

        // Seguridad: El cajero solo puede ver pedidos de su propia sucursal
        if (rol_usuario !== 'SuperAdministrador' && venta.id_tienda !== id_tienda_cajero) {
            res.status(403).json({ error: 'Este pedido pertenece a otra sucursal. El cliente debe ir a la sucursal correcta.' });
            return;
        }

        res.json({ success: true, data: venta });
    } catch (error) {
        console.error('Error buscando código de recolección:', error);
        res.status(500).json({ error: 'Error interno al buscar el código.' });
    }
};

// ==========================================
// 📦 2. MARCAR COMO ENTREGADO (ELIMINAR RESERVA)
// ==========================================
export const confirmarEntregaLocal = async (req: Request, res: Response): Promise<void> => {
    try {
        const id_venta = req.params.id_venta as string;
        const id_usuario_cajero = (req as any).usuarioTransaccion;
        const id_tienda_cajero = (req as any).usuarioTiendaId;
        const rol_usuario = (req as any).user?.rol;

        // 1. Buscamos la venta
        const venta = await prisma.ventas.findUnique({
            where: { id_venta },
            include: { detalles: true }
        });

        if (!venta) {
            res.status(404).json({ error: 'Venta no encontrada.' });
            return;
        }

        // 2. Validaciones de Negocio
        if (rol_usuario !== 'SuperAdministrador' && venta.id_tienda !== id_tienda_cajero) {
            res.status(403).json({ error: 'No puedes entregar pedidos de otra sucursal.' });
            return;
        }

        if (venta.estado === 'ENTREGADA') {
            res.status(400).json({ error: 'Este pedido ya fue marcado como entregado anteriormente.' });
            return;
        }

        if (venta.estado !== 'PAGADO' && venta.estado !== 'COMPLETADA' && venta.estado !== 'LISTO_PARA_RECOGER') {
            res.status(400).json({ error: `No se puede entregar. El estado actual del pedido es: ${venta.estado}` });
            return;
        }

        // 3. Ejecutamos la actualización atómica
        const ventaActualizada = await prisma.$transaction(async (tx) => {
            const actualizada = await tx.ventas.update({
                where: { id_venta },
                data: { estado: 'ENTREGADA' }
            });

            await tx.auditoriaVentas.create({
                data: {
                    id_auditoria: `LOG-${Date.now()}`,
                    id_venta: id_venta,
                    estado_anterior: venta.estado,
                    estado_nuevo: 'ENTREGADA',
                    id_usuario: id_usuario_cajero
                }
            });

            return actualizada;
        });

        // 4. 🔥 EMITIR EVENTO PARA VACIAR EL STOCK RESERVADO
        await publicarEventoVenta('PEDIDO_ENTREGADO', {
            id_venta: venta.id_venta,
            id_tienda: venta.id_tienda,
            id_cajero: id_usuario_cajero,
            items: venta.detalles.map(d => ({
                id_producto: d.id_producto,
                cantidad: d.cantidad
            }))
        });

        res.json({ success: true, message: 'Pedido entregado exitosamente al cliente.', data: ventaActualizada });

    } catch (error) {
        console.error('Error al confirmar entrega:', error);
        res.status(500).json({ error: 'Error interno al confirmar la entrega.' });
    }
};

// ✨ NUEVO: CONTROLADOR EXCLUSIVO PARA PUNTO DE VENTA FÍSICO
export const procesarVentaFisica = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_tienda, subtotal, impuestos, total, detalles, id_usuario } = req.body;
    
    // El cajero es quien está haciendo la transacción (viene del token)
    const id_cajero = (req as any).usuarioTransaccion || (req as any).user?.id;

    if (!id_tienda || !detalles || detalles.length === 0) {
      res.status(400).json({ error: 'Faltan datos requeridos (tienda o detalles del ticket).' });
      return;
    }

    // Generamos un ID específico para ventas de mostrador (POS - Point of Sale)
    const nuevaVentaId = `VTA-POS-${Date.now()}`;

    // 1. Transacción Atómica: Creamos la venta y su auditoría
    const nuevaVenta = await prisma.$transaction(async (tx) => {
      const venta = await tx.ventas.create({
        data: {
          id_venta: nuevaVentaId,
          id_usuario: id_usuario || id_cajero, // Puede ser null si es un cliente anónimo
          id_tienda: id_tienda,
          canal: 'FISICO',
          subtotal: subtotal,
          impuestos: impuestos,
          total: total,
          estado: 'ENTREGADA', // 👈 ¡CLAVE! Nace y muere como ENTREGADA al instante
          codigo_recoleccion: `POS-${Math.floor(1000 + Math.random() * 9000)}`, // Un código por si se necesita para devoluciones
          detalles: {
            create: detalles.map((item: any, index: number) => ({
              id_detalle: `DET-POS-${Date.now()}-${index}`,
              id_producto: item.id_producto,
              nombre_producto_snapshot: item.nombre_producto,
              cantidad: item.cantidad,
              precio_unitario: item.precio_unitario,
            }))
          }
        },
        include: { detalles: true }
      });

      // Dejamos registro inmediato en auditoría
      await tx.auditoriaVentas.create({
        data: {
          id_auditoria: `LOG-POS-${Date.now()}`,
          id_venta: nuevaVentaId,
          estado_anterior: 'N/A', // No había estado previo
          estado_nuevo: 'ENTREGADA',
          id_usuario: id_cajero
        }
      });

      return venta;
    });

    // 2. 📢 Disparamos el Evento para que Inventarios y Productos descuenten su stock físico
    await publicarEventoVenta('VENTA_FISICA_COMPLETADA', {
        id_venta: nuevaVenta.id_venta,
        id_tienda: id_tienda,
        id_cajero: id_cajero,
        items: detalles.map((d: any) => ({
            id_producto: d.id_producto,
            cantidad: d.cantidad
        }))
    });

    res.status(201).json(nuevaVenta);
  } catch (error) {
    console.error('Error procesando venta física en sucursal:', error);
    res.status(500).json({ error: 'Error interno al procesar el cobro en caja.' });
  }
};
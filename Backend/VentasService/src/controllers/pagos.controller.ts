// src/controllers/pagos.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Openpay from 'openpay';
import { publicarEventoVenta } from '../events/EventPublisher';

const prisma = new PrismaClient();

// Inicializamos Openpay
const openpay = new Openpay(
    process.env.OPENPAY_ID || '', 
    process.env.OPENPAY_PRIVATE_KEY || '', 
    false // Modo Sandbox
);

export const procesarPagoCheckout = async (req: Request, res: Response) => {
    try {
        const id_usuario = (req as any).usuarioTransaccion || (req as any).user?.id;
        const { tokenId, deviceSessionId, totalFront, id_tienda } = req.body;

        const idTiendaToken = (req as any).usuarioTiendaId; 
        const id_tienda_final = id_tienda || idTiendaToken;

        if (!id_tienda_final) return res.status(400).json({ success: false, message: 'No se detectó una tienda válida.' });
        if (!tokenId || !deviceSessionId) return res.status(400).json({ success: false, message: 'Faltan credenciales de pago' });

        const carrito = await prisma.carrito.findFirst({
            where: { id_usuario: id_usuario, estado: 'PENDIENTE' }
        });

        if (!carrito) return res.status(404).json({ success: false, message: 'No hay carrito PENDIENTE' });

        const itemsCarrito = await prisma.carritoItem.findMany({
            where: { id_carrito: carrito.id_carrito }
        });

        if (itemsCarrito.length === 0) return res.status(400).json({ success: false, message: 'El carrito está vacío' });

        const totalACobrar = parseFloat(totalFront);

        // OBTENER PRECIOS REALES
        const idsProductos = itemsCarrito.map(item => item.id_producto);
        let infoProductos: any[] = [];
        
        try {
            const response = await fetch(`${process.env.API_GATEWAY_URL || 'http://127.0.0.1:3000'}/api/productos/detalles-multiples`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.INTERNAL_API_KEY || 'clave-secreta-interna-modaglobal'
                },
                body: JSON.stringify({ ids: idsProductos })
            });
            if (response.ok) infoProductos = await response.json();
        } catch (error) {
             console.error("Error de red al contactar ProductoService:", error);
        }

        const chargeRequest = {
            source_id: tokenId,
            method: 'card',
            amount: totalACobrar,
            currency: 'MXN',
            description: `Compra Web - Carrito ${carrito.id_carrito}`,
            device_session_id: deviceSessionId,
            customer: {
                name: 'Cliente',
                last_name: 'ModaGlobal',
                email: 'cliente@modaglobal.com',
                phone_number: '9611234567'
            }
        };

        openpay.charges.create(chargeRequest, async (error: any, charge: any) => {
            if (error) {
                return res.status(402).json({ success: false, message: 'Pago declinado', error: error.description });
            }

            try {
                let nuevaVentaData: any = null;
                let detallesVentaData: any[] = [];
                let subtotalReal = parseFloat((totalACobrar / 1.16).toFixed(2));
                let impuestosReal = parseFloat((totalACobrar - subtotalReal).toFixed(2));
                let codigoRecoleccionTemp = `REC-${crypto.randomUUID().substring(0, 6).toUpperCase()}`;

                await prisma.$transaction(async (tx) => {
                    const nuevaVenta = await tx.ventas.create({
                        data: {
                            id_venta: `VTA-${crypto.randomUUID()}`,
                            id_usuario: id_usuario,
                            id_tienda: id_tienda_final, 
                            canal: 'WEB', 
                            total: totalACobrar,
                            subtotal: subtotalReal,         
                            impuestos: impuestosReal,       
                            codigo_recoleccion: codigoRecoleccionTemp, 
                            estado: 'COMPLETADA'
                        }
                    });
                    nuevaVentaData = nuevaVenta;

                    const detallesVenta = itemsCarrito.map(item => {
                        const productoReal = infoProductos.find(p => p.id_producto === item.id_producto);
                        return {
                            id_detalle: `DET-${crypto.randomUUID()}`,
                            id_venta: nuevaVenta.id_venta,
                            id_producto: item.id_producto,
                            cantidad: item.cantidad,
                            precio_unitario: productoReal ? productoReal.precio_base : 0, 
                            nombre_producto_snapshot: productoReal ? productoReal.nombre : 'Desconocido' 
                        };
                    });
                    detallesVentaData = detallesVenta;
                    
                    await tx.detalleVenta.createMany({ data: detallesVenta });

                    await tx.pago.create({
                        data: {
                            id_pago: `PAG-${crypto.randomUUID()}`,
                            id_venta: nuevaVenta.id_venta,
                            metodo_pago: 'TARJETA',
                            estado_pago: 'APROBADO',
                            monto: totalACobrar,
                            referencia_externa: charge.id 
                        }
                    });

                    await tx.carrito.update({ where: { id_carrito: carrito.id_carrito }, data: { estado: 'PAGADO' } });
                    await tx.carritoItem.deleteMany({ where: { id_carrito: carrito.id_carrito } });

                    await tx.auditoriaVentas.create({
                        data: {
                            id_auditoria: `LOG-${Date.now()}`,
                            id_venta: nuevaVenta.id_venta,
                            estado_anterior: 'NUEVA', 
                            estado_nuevo: 'COMPLETADA', 
                            id_usuario: id_usuario 
                        }
                    });
                });

                // ================================================================
                // 📦 EMISIÓN DEL EVENTO (¡SIN FETCH DIRECTOS!)
                // ================================================================
                try {
                    await publicarEventoVenta('VENTA_COMPLETADA', {
                        id_venta: nuevaVentaData.id_venta,
                        id_tienda: id_tienda_final,
                        id_usuario: id_usuario,
                        items: itemsCarrito.map(item => ({
                            id_producto: item.id_producto,
                            cantidad: item.cantidad
                        }))
                    });
                } catch (e) {
                    console.error("Error publicando evento de venta:", e);
                }

                return res.status(200).json({ 
                    success: true, 
                    message: '¡Pago procesado con éxito!',
                    ticket: {
                        id_venta: nuevaVentaData.id_venta,
                        codigo_recoleccion: codigoRecoleccionTemp,
                        fecha: new Date().toISOString(),
                        tienda: id_tienda_final,
                        subtotal: subtotalReal,
                        impuestos: impuestosReal,
                        total: totalACobrar,
                        items: detallesVentaData.map(d => ({
                            nombre: d.nombre_producto_snapshot,
                            cantidad: d.cantidad,
                            precio: d.precio_unitario
                        }))
                    }
                });

            } catch (dbError) {
                return res.status(500).json({ success: false, message: 'Pago cobrado pero error al registrar.' });
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error interno en checkout' });
    }
};
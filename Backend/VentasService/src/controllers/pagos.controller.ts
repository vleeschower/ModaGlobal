// src/controllers/pagos.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Openpay from 'openpay';

const prisma = new PrismaClient();

// Inicializamos Openpay
const openpay = new Openpay(
    process.env.OPENPAY_ID || '', 
    process.env.OPENPAY_PRIVATE_KEY || '', 
    false // Modo Sandbox
);

export const procesarPagoCheckout = async (req: Request, res: Response) => {
    try {
        const id_usuario = (req as any).usuarioTransaccion;
        const { tokenId, deviceSessionId, totalFront } = req.body;

        if (!tokenId || !deviceSessionId) {
            return res.status(400).json({ success: false, message: 'Faltan credenciales de pago' });
        }

        // 1. Buscamos el carrito PENDIENTE
        const carrito = await prisma.carrito.findFirst({
            where: { id_usuario: id_usuario, estado: 'PENDIENTE' }
        });

        if (!carrito) return res.status(404).json({ success: false, message: 'No hay carrito PENDIENTE' });

        // 2. Extraemos los items (usando carritoItem por el schema)
        const itemsCarrito = await prisma.carritoItem.findMany({
            where: { id_carrito: carrito.id_carrito }
        });

        if (itemsCarrito.length === 0) return res.status(400).json({ success: false, message: 'El carrito está vacío' });

        const totalACobrar = parseFloat(totalFront);

        // 3. ARMAMOS LA PETICIÓN A OPENPAY
        const chargeRequest = {
            source_id: tokenId,
            method: 'card',
            amount: totalACobrar,
            currency: 'MXN',
            description: `Compra en ModaGlobal - Carrito ${carrito.id_carrito}`,
            device_session_id: deviceSessionId,
            customer: {
                name: 'Cliente',
                last_name: 'ModaGlobal',
                email: 'cliente@modaglobal.com',
                phone_number: '9611234567'
            }
        };

        // 4. LANZAMOS EL COBRO A OPENPAY
        openpay.charges.create(chargeRequest, async (error: any, charge: any) => {
            if (error) {
                console.error('❌ Error de Openpay:', error);
                return res.status(402).json({ 
                    success: false, 
                    message: 'Pago declinado por el banco', 
                    error: error.description 
                });
            }

            // 🔥 ¡PAGO APROBADO EN OPENPAY! 🔥
            try {
                // 5. Transacción de Prisma adaptada a tu schema
                await prisma.$transaction(async (tx) => {
                    
                    // a) Creamos la Venta Principal (modelo Ventas -> tx.ventas)
                    const nuevaVenta = await tx.ventas.create({
                        data: {
                            id_venta: `VTA-${crypto.randomUUID()}`,
                            id_usuario: id_usuario,
                            canal: 'WEB', // Puedes poner lo que gustes
                            total: totalACobrar,
                            subtotal: totalACobrar, // Ajustable después
                            estado: 'COMPLETADA'
                        }
                    });

                    // b) Pasamos items a DetalleVenta (modelo DetalleVenta -> tx.detalleVenta)
                    const detallesVenta = itemsCarrito.map(item => ({
                        id_detalle: `DET-${crypto.randomUUID()}`,
                        id_venta: nuevaVenta.id_venta,
                        id_producto: item.id_producto,
                        cantidad: item.cantidad,
                        precio_unitario: 0 // Deuda técnica: Cruce con ProductosService
                    }));
                    await tx.detalleVenta.createMany({ data: detallesVenta }); // 👈 ¡Arreglado!

                    // c) Creamos el registro en tabla Pago (modelo Pago -> tx.pago)
                    await tx.pago.create({
                        data: {
                            id_pago: `PAG-${crypto.randomUUID()}`,
                            id_venta: nuevaVenta.id_venta,
                            metodo_pago: 'TARJETA',
                            estado_pago: 'APROBADO',
                            monto: totalACobrar,
                            referencia_externa: charge.id // ID de Openpay
                        }
                    });

                    // d) Actualizamos estado del Carrito
                    await tx.carrito.update({
                        where: { id_carrito: carrito.id_carrito },
                        data: { estado: 'PAGADO' }
                    });

                    // e) Vaciamos items del carrito (modelo CarritoItem -> tx.carritoItem)
                    await tx.carritoItem.deleteMany({
                        where: { id_carrito: carrito.id_carrito }
                    });
                });

                // 6. Respondemos con victoria
                return res.status(200).json({ 
                    success: true, 
                    message: '¡Pago procesado y guardado con éxito!'
                });

            } catch (dbError) {
                console.error('Error al guardar en BD:', dbError);
                return res.status(500).json({ success: false, message: 'Pago cobrado pero error al registrar en sistema.' });
            }
        });

    } catch (error) {
        console.error('Error crítico en el checkout:', error);
        res.status(500).json({ success: false, message: 'Error interno al procesar el pago' });
    }
};
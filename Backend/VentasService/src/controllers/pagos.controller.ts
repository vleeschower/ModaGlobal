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

        // ================================================================
        // 🏪 LÓGICA MAESTRA DE SUCURSAL (Temporalmente al azar para pruebas)
        // ================================================================
        const idTiendaToken = (req as any).usuarioTiendaId; 
        const idTiendaFrontend = req.body.id_tienda; 

        // Como aún no tenemos el selector en React, ponemos tus sucursales y lanzamos los dados
        const tiendasDisponibles = ['tnd-chiapas-01', 'tnd-chiapas-02', 'SUC-CENTRO-01'];
        const tiendaAlAzar = tiendasDisponibles[Math.floor(Math.random() * tiendasDisponibles.length)];

        // Si tiene en BD, la usa. Si la mandas de React, la usa. Si no, le toca una al azar.
        const id_tienda_final = idTiendaToken || idTiendaFrontend || tiendaAlAzar;
        // ================================================================

        if (!tokenId || !deviceSessionId) {
            return res.status(400).json({ success: false, message: 'Faltan credenciales de pago' });
        }

        // Buscamos el carrito PENDIENTE
        const carrito = await prisma.carrito.findFirst({
            where: { id_usuario: id_usuario, estado: 'PENDIENTE' }
        });

        if (!carrito) return res.status(404).json({ success: false, message: 'No hay carrito PENDIENTE' });

        // Extraemos los items
        const itemsCarrito = await prisma.carritoItem.findMany({
            where: { id_carrito: carrito.id_carrito }
        });

        if (itemsCarrito.length === 0) return res.status(400).json({ success: false, message: 'El carrito está vacío' });

        const totalACobrar = parseFloat(totalFront);

        // ================================================================
        // 🔥 EL CRUCE CON PRODUCTOSERVICE (Usando fetch nativo)
        // ================================================================
        const idsProductos = itemsCarrito.map(item => item.id_producto);
        let infoProductos: any[] = [];
        
        try {
            const response = await fetch(`${process.env.API_GATEWAY_URL || 'http://localhost:3000'}/api/productos/detalles-multiples`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.INTERNAL_API_KEY || 'clave-secreta-interna-modaglobal'
                },
                body: JSON.stringify({ ids: idsProductos })
            });

            if (response.ok) {
                infoProductos = await response.json();
            } else {
                console.warn("⚠️ No se pudo obtener info de productos. Código:", response.status);
            }
        } catch (error) {
             console.error("❌ Error de red al contactar ProductoService:", error);
        }
        // ================================================================

        // ARMAMOS LA PETICIÓN A OPENPAY
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

        // LANZAMOS EL COBRO A OPENPAY
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
                await prisma.$transaction(async (tx) => {
                    
                    // MATEMÁTICA Y LOGÍSTICA PARA EL TICKET
                    const subtotalReal = parseFloat((totalACobrar / 1.16).toFixed(2));
                    const impuestosReal = parseFloat((totalACobrar - subtotalReal).toFixed(2));
                    const codigoRecoleccionTemp = `REC-${crypto.randomUUID().substring(0, 6).toUpperCase()}`;

                    // a) Creamos la Venta Principal
                    const nuevaVenta = await tx.ventas.create({
                        data: {
                            id_venta: `VTA-${crypto.randomUUID()}`,
                            id_usuario: id_usuario,
                            
                            id_tienda: id_tienda_final, // 👈 Se asignará la que haya salido en la ruleta
                            
                            canal: 'WEB', 
                            total: totalACobrar,
                            subtotal: subtotalReal,         
                            impuestos: impuestosReal,       
                            codigo_recoleccion: codigoRecoleccionTemp, 
                            estado: 'COMPLETADA'
                        }
                    });

                    // b) Pasamos items a DetalleVenta
                    const detallesVenta = itemsCarrito.map(item => {
                        const productoReal = infoProductos.find(p => p.id_producto === item.id_producto);
                        
                        return {
                            id_detalle: `DET-${crypto.randomUUID()}`,
                            id_venta: nuevaVenta.id_venta,
                            id_producto: item.id_producto,
                            cantidad: item.cantidad,
                            precio_unitario: productoReal ? productoReal.precio_base : 0, 
                            nombre_producto_snapshot: productoReal ? productoReal.nombre : 'Producto Desconocido' 
                        };
                    });
                    
                    await tx.detalleVenta.createMany({ data: detallesVenta });

                    // c) Creamos el registro en tabla Pago
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

                    // d) Actualizamos estado del Carrito
                    await tx.carrito.update({
                        where: { id_carrito: carrito.id_carrito },
                        data: { estado: 'PAGADO' }
                    });

                    // e) Vaciamos items del carrito
                    await tx.carritoItem.deleteMany({
                        where: { id_carrito: carrito.id_carrito }
                    });

                    // ================================================================
                    // 🔥 f) REGISTRO DE AUDITORÍA (LOGS)
                    // ================================================================
                    await tx.auditoriaVentas.create({
                        data: {
                            id_auditoria: `LOG-${Date.now()}`,
                            id_venta: nuevaVenta.id_venta,
                            estado_anterior: 'NUEVA', 
                            estado_nuevo: nuevaVenta.estado || 'COMPLETADA', 
                            id_usuario: id_usuario 
                        }
                    });
                    // ================================================================
                });

                // Respondemos con victoria
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
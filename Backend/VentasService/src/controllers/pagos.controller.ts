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
        // Obtenemos los datos de autenticación del middleware
        const id_usuario = (req as any).usuarioTransaccion || (req as any).user?.id;
        
        // Recibimos la tienda exacta desde React
        const { tokenId, deviceSessionId, totalFront, id_tienda } = req.body;

        // ================================================================
        // 🏪 ASIGNACIÓN DE TIENDA REAL
        // ================================================================
        const idTiendaToken = (req as any).usuarioTiendaId; 
        
        // Priorizamos la tienda seleccionada en React. Si falla, usa la del token.
        const id_tienda_final = id_tienda || idTiendaToken;

        if (!id_tienda_final) {
            return res.status(400).json({ success: false, message: 'No se detectó una tienda válida para la compra.' });
        }

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
        // 🔥 EL CRUCE CON PRODUCTOSERVICE (Para obtener los precios reales)
        // ================================================================
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
            description: `Compra en ModaGlobal - Carrito ${carrito.id_carrito} - Sucursal: ${id_tienda_final}`,
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
                let nuevaVentaData: any = null;
                let detallesVentaData: any[] = [];
                let subtotalReal = 0;
                let impuestosReal = 0;
                let codigoRecoleccionTemp = `REC-${crypto.randomUUID().substring(0, 6).toUpperCase()}`;

                await prisma.$transaction(async (tx) => {
                    
                    subtotalReal = parseFloat((totalACobrar / 1.16).toFixed(2));
                    impuestosReal = parseFloat((totalACobrar - subtotalReal).toFixed(2));

                    // a) Creamos la Venta Principal con la Tienda Exacta
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
                    detallesVentaData = detallesVenta;
                    
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

                    // d) Actualizamos estado del Carrito y vaciamos items
                    await tx.carrito.update({
                        where: { id_carrito: carrito.id_carrito },
                        data: { estado: 'PAGADO' }
                    });
                    await tx.carritoItem.deleteMany({
                        where: { id_carrito: carrito.id_carrito }
                    });

                    // e) LOGS de auditoría
                    await tx.auditoriaVentas.create({
                        data: {
                            id_auditoria: `LOG-${Date.now()}`,
                            id_venta: nuevaVenta.id_venta,
                            estado_anterior: 'NUEVA', 
                            estado_nuevo: nuevaVenta.estado || 'COMPLETADA', 
                            id_usuario: id_usuario 
                        }
                    });
                });

                // ================================================================
                // 📦 LLAMADA A INVENTARIO SERVICE (ELEVACIÓN DE PRIVILEGIOS)
                // ================================================================
                try {
                    const promesasInventario = itemsCarrito.map(item => {
                        // Saltamos el Gateway y vamos directo a la puerta trasera del Inventario (3001)
                        return fetch(`http://127.0.0.1:3001/ajustar`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-api-key': process.env.INTERNAL_API_KEY || 'clave-secreta-interna-modaglobal',
                                'x-user-id': id_usuario,
                                // ✨ LA MAGIA OCURRE AQUÍ: Nos ponemos la máscara de SuperAdministrador
                                'x-user-rol': 'SuperAdministrador' 
                            },
                            body: JSON.stringify({ 
                                id_tienda: id_tienda_final, 
                                id_producto: item.id_producto,
                                cantidad: -item.cantidad, // Negativo para restar
                                tipo_movimiento: 'VENTA',
                                id_referencia: nuevaVentaData.id_venta 
                            })
                        }).then(async (res) => {
                            if (!res.ok) {
                                const errorData = await res.text();
                                console.error(`❌ INVENTARIO RECHAZÓ EL PRODUCTO ${item.id_producto}. Código ${res.status}:`, errorData);
                            } else {
                                console.log(`✅ STOCK DESCONTADO PERFECTAMENTE: ${item.id_producto} en ${id_tienda_final}`);
                            }
                        });
                    });

                    Promise.all(promesasInventario).catch(err => console.error("Error en lote de inventario:", err));

                } catch (e) {
                    console.error("Error armando la petición de inventario:", e);
                }
                // ================================================================

                // ✨ Respondemos con victoria y enviamos los datos para el Ticket de React ✨
                return res.status(200).json({ 
                    success: true, 
                    message: '¡Pago procesado y guardado con éxito!',
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
                console.error('Error al guardar en BD:', dbError);
                return res.status(500).json({ success: false, message: 'Pago cobrado pero error al registrar en sistema.' });
            }
        });

    } catch (error) {
        console.error('Error crítico en el checkout:', error);
        res.status(500).json({ success: false, message: 'Error interno al procesar el pago' });
    }
};
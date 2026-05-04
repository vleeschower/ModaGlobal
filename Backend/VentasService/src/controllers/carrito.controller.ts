// src/controllers/carrito.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto'; // <-- Nativo de Node.js para generar IDs escalables e irrepetibles

const prisma = new PrismaClient();

/**
 * Función auxiliar para obtener el carrito activo (estado PENDIENTE)
 * o crearlo de forma segura si no existe.
 */
const getOrCreateActiveCart = async (id_usuario: string) => {
    let carrito = await prisma.carrito.findFirst({
        where: {
            id_usuario: id_usuario,
            estado: 'PENDIENTE'
        }
    });

    if (!carrito) {
        // Generamos un ID seguro y escalable
        const nuevoIdCarrito = `CRT-${crypto.randomUUID()}`; 
        
        carrito = await prisma.carrito.create({
            data: {
                id_carrito: nuevoIdCarrito, 
                id_usuario: id_usuario,
                estado: 'PENDIENTE'
            }
        });
    }

    return carrito;
};

// ==========================================
// CONTROLADORES PRINCIPALES
// ==========================================

export const getCarrito = async (req: Request, res: Response) => {
    try {
        // 👇 AHORA LEE LA VARIABLE CORRECTA DEL GUARDIA
        const id_usuario = (req as any).usuarioTransaccion; 
        const carrito = await getOrCreateActiveCart(id_usuario);

        // 1. Sacamos los items crudos de la BD (solo IDs y cantidad)
        const items = await prisma.carritoItem.findMany({
            where: { id_carrito: carrito.id_carrito }
        });

        if (items.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // ================================================================
        // 🔥 2. EL CRUCE CON PRODUCTOSERVICE (Para traer imágenes, nombres y precios)
        // ================================================================
        const idsProductos = items.map(item => item.id_producto);
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
                console.warn("⚠️ No se pudo obtener info de productos para el carrito.");
            }
        } catch (error) {
             console.error("❌ Error de red al contactar ProductoService:", error);
        }

        // 3. Mezclamos la cantidad con la foto y los detalles
        const itemsCompletos = items.map(item => {
            const productoReal = infoProductos.find(p => p.id_producto === item.id_producto);
            
            return {
                id_item: item.id_item,
                id_carrito: item.id_carrito,
                id_producto: item.id_producto,
                cantidad: item.cantidad,
                // 👇 AQUÍ LE PEGAMOS TODA LA INFO PARA REACT (incluida la imagen)
                producto: productoReal ? productoReal : null 
            };
        });

        res.json({ success: true, data: itemsCompletos });

    } catch (error) {
        console.error('Error en getCarrito:', error);
        res.status(500).json({ success: false, message: 'Error al obtener el carrito' });
    }
};

export const upsertCarritoItem = async (req: Request, res: Response) => {
    try {
        // 👇 AHORA LEE LA VARIABLE CORRECTA DEL GUARDIA
        const id_usuario = (req as any).usuarioTransaccion;
        const { id_producto, cantidad } = req.body;
        
        if (!id_producto || cantidad === undefined) {
            return res.status(400).json({ success: false, message: 'Faltan datos del producto' });
        }

        const carrito = await getOrCreateActiveCart(id_usuario);

        const itemExistente = await prisma.carritoItem.findFirst({
            where: {
                id_carrito: carrito.id_carrito,
                id_producto: id_producto
            }
        });

        if (itemExistente) {
            // 👇 AQUÍ ESTÁ LA MAGIA: Sumamos la cantidad nueva a la que ya existía
            await prisma.carritoItem.update({
                where: { id_item: itemExistente.id_item },
                data: { cantidad: itemExistente.cantidad + cantidad } 
            });
            res.json({ success: true, message: 'Cantidad actualizada' });
        } else {
            await prisma.carritoItem.create({
                data: {
                    id_item: `ITM-${crypto.randomUUID()}`, // <-- ID escalable
                    id_carrito: carrito.id_carrito,
                    id_producto: id_producto,
                    cantidad: cantidad
                }
            });
            res.status(201).json({ success: true, message: 'Producto añadido' });
        }
    } catch (error) {
        console.error('Error en upsertCarritoItem:', error);
        res.status(500).json({ success: false, message: 'Error al procesar el item del carrito' });
    }
};

export const syncCarrito = async (req: Request, res: Response) => {
    try {
        const id_usuario = (req as any).usuarioTransaccion;
        
        // Magia 1: Atrapamos el array de items, no importa si React lo manda envuelto en {items: ...} o directo [...]
        const items = req.body.items || req.body; 

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Formato de items inválido' });
        }

        const carrito = await getOrCreateActiveCart(id_usuario);

        for (const localItem of items) {
            // 👇 MAGIA 2: Sacamos el ID sin importar si viene "anidado" o "plano"
            const prodId = localItem.producto?.id_producto || localItem.id_producto;
            const cant = localItem.cantidad;

            if (!prodId) continue; 

            const itemExistente = await prisma.carritoItem.findFirst({
                where: {
                    id_carrito: carrito.id_carrito,
                    id_producto: prodId
                }
            });

            if (itemExistente) {
                await prisma.carritoItem.update({
                    where: { id_item: itemExistente.id_item },
                    data: { cantidad: itemExistente.cantidad + cant }
                });
            } else {
                await prisma.carritoItem.create({
                    data: {
                        id_item: `ITM-${crypto.randomUUID()}`,
                        id_carrito: carrito.id_carrito,
                        id_producto: prodId,
                        cantidad: cant
                    }
                });
            }
        }

        res.json({ success: true, message: 'Sincronización exitosa' });
    } catch (error) {
        console.error('Error en syncCarrito:', error);
        res.status(500).json({ success: false, message: 'Error en la sincronización' });
    }
};

export const removeFromCarrito = async (req: Request, res: Response) => {
    try {
        // 👇 AHORA LEE LA VARIABLE CORRECTA DEL GUARDIA
        const id_usuario = (req as any).usuarioTransaccion;
        
        // AQUÍ ESTÁ LA MAGIA: Le agregamos "as string"
        const id_producto = req.params.id_producto as string;
        
        const carrito = await prisma.carrito.findFirst({
            where: { id_usuario, estado: 'PENDIENTE' }
        });

        if (carrito) {
            const itemToDelete = await prisma.carritoItem.findFirst({
                where: {
                    id_carrito: carrito.id_carrito,
                    id_producto: id_producto 
                }
            });

            if (itemToDelete) {
                await prisma.carritoItem.delete({
                    where: { id_item: itemToDelete.id_item }
                });
            }
        }

        res.json({ success: true, message: 'Producto eliminado del carrito' });
    } catch (error) {
        console.error('Error en removeFromCarrito:', error);
        res.status(500).json({ success: false, message: 'Error al eliminar el producto' });
    }
};

export const clearCarritoDB = async (req: Request, res: Response) => {
    try {
        // 👇 AHORA LEE LA VARIABLE CORRECTA DEL GUARDIA
        const id_usuario = (req as any).usuarioTransaccion;
        const carrito = await prisma.carrito.findFirst({
            where: { id_usuario, estado: 'PENDIENTE' }
        });

        if (carrito) {
            await prisma.carritoItem.deleteMany({
                where: { id_carrito: carrito.id_carrito }
            });
        }

        res.json({ success: true, message: 'Carrito vaciado' });
    } catch (error) {
        console.error('Error en clearCarritoDB:', error);
        res.status(500).json({ success: false, message: 'Error al vaciar el carrito' });
    }
};
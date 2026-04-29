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
                id_carrito: nuevoIdCarrito, // <-- Aquí solucionamos el error de la línea 22
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
        const id_usuario = (req as any).user.id_usuario; 
        const carrito = await getOrCreateActiveCart(id_usuario);

        // Usamos carritoItem (camelCase) como manda Prisma
        const items = await prisma.carritoItem.findMany({
            where: { id_carrito: carrito.id_carrito }
        });

        res.json({ success: true, data: items });
    } catch (error) {
        console.error('Error en getCarrito:', error);
        res.status(500).json({ success: false, message: 'Error al obtener el carrito' });
    }
};

export const upsertCarritoItem = async (req: Request, res: Response) => {
    try {
        const id_usuario = (req as any).user.id_usuario;
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
            await prisma.carritoItem.update({
                where: { id_item: itemExistente.id_item },
                data: { cantidad: cantidad } 
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
        const id_usuario = (req as any).user.id_usuario;
        const { items } = req.body; 

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ success: false, message: 'Formato de items inválido' });
        }

        const carrito = await getOrCreateActiveCart(id_usuario);

        for (const localItem of items) {
            const prodId = localItem.producto.id_producto;
            const cant = localItem.cantidad;

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
                        id_item: `ITM-${crypto.randomUUID()}`, // <-- ID escalable
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
        const id_usuario = (req as any).user.id_usuario;
        
        // 👇 AQUÍ ESTÁ LA MAGIA: Le agregamos "as string"
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
        const id_usuario = (req as any).user.id_usuario;
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
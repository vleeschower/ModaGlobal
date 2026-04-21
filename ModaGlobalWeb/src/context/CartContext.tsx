// src/context/CartContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { type Producto } from '../types/Producto';
import Swal from 'sweetalert2';

interface CartItem {
  producto: Producto;
  cantidad: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (producto: Producto, cantidad: number) => void;
  removeFromCart: (productoId: string) => void;
  updateQuantity: (productoId: string, cantidad: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    // Intentamos recuperar el carrito guardado
    const savedCart = localStorage.getItem('mg_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // Cada que el carrito cambie, lo guardamos en la memoria del navegador
  useEffect(() => {
    localStorage.setItem('mg_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (producto: Producto, cantidad: number) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.producto.id_producto === producto.id_producto);
      
      if (existingItem) {
        // Si ya está en el carrito, solo le sumamos la cantidad
        return prevCart.map(item => 
          item.producto.id_producto === producto.id_producto 
            ? { ...item, cantidad: item.cantidad + cantidad }
            : item
        );
      }
      
      // Si es nuevo, lo agregamos a la lista
      return [...prevCart, { producto, cantidad }];
    });

    // Alerta visual chiquita y no invasiva (Toast)
    Swal.fire({
      toast: true,
      position: 'bottom-end',
      icon: 'success',
      title: 'Agregado al carrito',
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
      background: '#10b981', // emerald-500
      color: '#fff'
    });
  };

  const removeFromCart = (productoId: string) => {
    setCart(prevCart => prevCart.filter(item => item.producto.id_producto !== productoId));
  };

  const updateQuantity = (productoId: string, cantidad: number) => {
    if (cantidad < 1) return;
    setCart(prevCart => prevCart.map(item => 
      item.producto.id_producto === productoId ? { ...item, cantidad } : item
    ));
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((total, item) => total + item.cantidad, 0);
  const totalPrice = cart.reduce((total, item) => total + (Number(item.producto.precio_base) * item.cantidad), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de un CartProvider');
  return context;
};
// src/context/CartContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { type Producto } from '../types/Producto';
import { useAuth } from './AuthContext'; // Importamos el contexto de autenticación
import { apiService } from '../services/ApiService'; // Asumiendo que aquí pondrás las llamadas
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
  loading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('mg_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // 1. Efecto para persistencia local (siempre corre)
  useEffect(() => {
    localStorage.setItem('mg_cart', JSON.stringify(cart));
  }, [cart]);

  // 2. Efecto de Sincronización: Cuando el usuario se loguea
  useEffect(() => {
    if (isAuthenticated && user) {
      syncLocalCartToDB();
    }
  }, [isAuthenticated]);

  const syncLocalCartToDB = async () => {
    if (cart.length === 0) {
      // Si no hay nada local, traemos lo que ya tenga en la DB
      loadCartFromDB();
      return;
    }
    
    setLoading(true);
    try {
      // Mandamos los productos locales a la tabla 'Carrito'
      // Tu API de VentasService debería tener un endpoint de "bulk insert" o "sync"
      await apiService.syncCarrito(cart); 
      // Una vez sincronizado, limpiamos el local y traemos la versión final de la DB
      loadCartFromDB();
    } catch (error) {
      console.error("Error al sincronizar carrito:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCartFromDB = async () => {
    try {
      const res = await apiService.getCarrito();
      if (res.success) {
        setCart(res.data); // Actualizamos el estado con lo de Azure SQL
      }
    } catch (error) {
      console.error("Error al cargar carrito de DB:", error);
    }
  };

  const addToCart = async (producto: Producto, cantidad: number) => {
    const existingItem = cart.find(item => item.producto.id_producto === producto.id_producto);
    const nuevaCantidad = existingItem ? existingItem.cantidad + cantidad : cantidad;

    // Si está logueado, mandamos el cambio a la base de datos
    if (isAuthenticated) {
      try {
        await apiService.upsertCarritoItem(producto.id_producto, nuevaCantidad);
      } catch (error) {
        console.error("No se pudo guardar en DB", error);
      }
    }

    // Actualizamos estado local para que la UI responda rápido
    setCart(prevCart => {
      if (existingItem) {
        return prevCart.map(item => 
          item.producto.id_producto === producto.id_producto 
            ? { ...item, cantidad: nuevaCantidad }
            : item
        );
      }
      return [...prevCart, { producto, cantidad }];
    });

    showToast('Agregado al carrito');
  };

  const removeFromCart = async (productoId: string) => {
    if (isAuthenticated) {
      await apiService.removeFromCarrito(productoId);
    }
    setCart(prevCart => prevCart.filter(item => item.producto.id_producto !== productoId));
  };

  const updateQuantity = async (productoId: string, cantidad: number) => {
    if (cantidad < 1) return;
    
    if (isAuthenticated) {
      await apiService.upsertCarritoItem(productoId, cantidad);
    }

    setCart(prevCart => prevCart.map(item => 
      item.producto.id_producto === productoId ? { ...item, cantidad } : item
    ));
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      await apiService.clearCarritoDB();
    }
    setCart([]);
  };

  const showToast = (title: string) => {
    Swal.fire({
      toast: true,
      position: 'bottom-end',
      icon: 'success',
      title,
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
      background: '#10b981',
      color: '#fff'
    });
  };

  const totalItems = cart.reduce((total, item) => total + item.cantidad, 0);
  const totalPrice = cart.reduce((total, item) => total + (Number(item.producto.precio_base) * item.cantidad), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice, loading }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de un CartProvider');
  return context;
};
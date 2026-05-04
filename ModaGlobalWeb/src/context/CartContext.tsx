// src/context/CartContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { type Producto } from '../types/Producto';
import { useAuth } from './AuthContext'; 
import { apiService } from '../services/ApiService'; 
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
  const isSyncing = useRef(false); 
  
  // 1. Iniciamos el carrito desde el LocalStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('mg_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  // 2. Guardamos en LocalStorage cada que el carrito cambie
  useEffect(() => {
    localStorage.setItem('mg_cart', JSON.stringify(cart));
  }, [cart]);

  // 3. Efecto maestro: Solo se dispara cuando inicias sesión o das F5 estando logueado
  useEffect(() => {
    if (isAuthenticated && user && !isSyncing.current) {
      smartSyncCart();
    }
  }, [isAuthenticated, user]);

  // ==============================================================
  // 🧠 LA MAGIA ANTI-DUPLICADOS (Smart Diffing)
  // ==============================================================
  const smartSyncCart = async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    setLoading(true);

    try {
      // 1. Pedimos la verdad absoluta a la base de datos
      const res = await apiService.getCarrito();
      const dbItems = (res.success && res.data) ? res.data : [];

      // 2. Comparamos: Buscamos items locales que NO existan en la DB
      const itemsNuevosParaLaDB = cart.filter(localItem => {
        const localId = localItem.producto?.id_producto || (localItem as any).id_producto;
        const existeEnDB = dbItems.some((dbItem: any) => dbItem.id_producto === localId);
        // Solo conservamos los que NO están en la DB
        return !existeEnDB;
      });

      // 3. SOLO enviamos algo si hay items nuevos. ¡Esto evita que el F5 sume infinitamente!
      if (itemsNuevosParaLaDB.length > 0) {
        await apiService.syncCarrito(itemsNuevosParaLaDB);
        // Como enviamos cosas nuevas, volvemos a descargar la versión final de la DB
        const finalRes = await apiService.getCarrito();
        if (finalRes.success && finalRes.data) {
          aplicarDatosDBalFrontend(finalRes.data);
        }
      } else {
        // 4. Si no hay nada nuevo (F5 normal), simplemente copiamos las cantidades de la DB al frontend
        aplicarDatosDBalFrontend(dbItems);
      }

    } catch (error) {
      console.error("Error en sincronización inteligente:", error);
    } finally {
      isSyncing.current = false;
      setLoading(false);
    }
  };

  // Función para re-armar el carrito usando los datos de la DB pero rescatando las fotos locales
  const aplicarDatosDBalFrontend = (dbItems: any[]) => {
    setCart(prevCart => {
      // Guardamos las fotos y precios que ya tenemos en memoria
      const infoMap = new Map();
      prevCart.forEach(item => {
        const id = item.producto?.id_producto || (item as any).id_producto;
        if (id && item.producto?.nombre) {
          infoMap.set(id, item.producto);
        }
      });

      // Armamos el carrito exacto sin sumar nada, copiando exactamente la cantidad de la DB
      const cleanCart: CartItem[] = dbItems.map((dbItem: any) => ({
        producto: infoMap.get(dbItem.id_producto) || { id_producto: dbItem.id_producto } as Producto,
        cantidad: dbItem.cantidad
      }));

      return cleanCart;
    });
  };
  // ==============================================================

  const addToCart = async (producto: Producto, cantidad: number) => {
    const productId = producto.id_producto;
    const existingItem = cart.find(item => 
      (item.producto?.id_producto || (item as any).id_producto) === productId
    );
    
    const nuevaCantidad = existingItem ? existingItem.cantidad + cantidad : cantidad;

    if (isAuthenticated) {
      try {
        await apiService.upsertCarritoItem(productId, nuevaCantidad);
      } catch (error) { console.error(error); }
    }

    setCart(prevCart => {
      if (existingItem) {
        return prevCart.map(item => 
          (item.producto?.id_producto || (item as any).id_producto) === productId 
            ? { ...item, cantidad: nuevaCantidad }
            : item
        );
      }
      return [...prevCart, { producto, cantidad }];
    });
    showToast('Agregado al carrito');
  };

  const removeFromCart = async (productoId: string) => {
    if (isAuthenticated) await apiService.removeFromCarrito(productoId);
    setCart(prevCart => prevCart.filter(item => 
      (item.producto?.id_producto || (item as any).id_producto) !== productoId
    ));
  };

  const updateQuantity = async (productoId: string, cantidad: number) => {
    if (cantidad < 1) return;
    if (isAuthenticated) await apiService.upsertCarritoItem(productoId, cantidad);
    
    setCart(prevCart => prevCart.map(item => 
      (item.producto?.id_producto || (item as any).id_producto) === productoId 
        ? { ...item, cantidad } 
        : item
    ));
  };

  const clearCart = async () => {
    if (isAuthenticated) await apiService.clearCarritoDB();
    setCart([]);
  };

  const showToast = (title: string) => {
    Swal.fire({
      toast: true, position: 'bottom-end', icon: 'success', title,
      showConfirmButton: false, timer: 1500, timerProgressBar: true,
      background: '#10b981', color: '#fff'
    });
  };

  const totalItems = cart.reduce((total, item) => total + (item.cantidad || 0), 0);
  const totalPrice = cart.reduce((total, item) => 
    total + (Number(item.producto?.precio_base || 0) * (item.cantidad || 0)), 
  0);

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
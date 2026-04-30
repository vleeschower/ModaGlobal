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
  const isSyncing = useRef(false); // 🚩 Bandera para evitar que se ejecute 2 veces al mismo tiempo
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('mg_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  useEffect(() => {
    localStorage.setItem('mg_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (isAuthenticated && user && !isSyncing.current) {
      syncLocalCartToDB();
    }
  }, [isAuthenticated, user]);

  const syncLocalCartToDB = async () => {
    if (isSyncing.current) return;
    isSyncing.current = true; // Bloqueamos nuevas ejecuciones

    try {
      if (cart.length > 0) {
        await apiService.syncCarrito(cart); 
      }
      await loadCartFromDB();
    } catch (error) {
      console.error("Error en sincronización:", error);
    } finally {
      isSyncing.current = false; // Liberamos
    }
  };

  const loadCartFromDB = async () => {
    try {
      const res = await apiService.getCarrito();
      if (res.success && res.data) {
        const dbItems = res.data;

        setCart(prevCart => {
          // 🛠️ ESTRATEGIA DE DEPURACIÓN TOTAL
          // Creamos un mapa con lo que ya tenemos para recuperar imágenes/precios rápidamente
          const infoMap = new Map();
          prevCart.forEach(item => {
            const id = item.producto?.id_producto || (item as any).id_producto;
            if (id) infoMap.set(id, item.producto);
          });

          // Filtramos duplicados basándonos únicamente en los IDs que vienen de la DB
          const uniqueIds = new Set();
          const cleanCart: CartItem[] = [];

          dbItems.forEach((dbItem: any) => {
            if (!uniqueIds.has(dbItem.id_producto)) {
              uniqueIds.add(dbItem.id_producto);
              
              cleanCart.push({
                // Si ya teníamos el producto con imagen en el mapa, lo usamos
                producto: infoMap.get(dbItem.id_producto) || { id_producto: dbItem.id_producto } as Producto,
                cantidad: dbItem.cantidad
              });
            }
          });

          return cleanCart;
        });
      }
    } catch (error) {
      console.error("Error al cargar carrito:", error);
    }
  };

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
    showToast('Agregado');
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
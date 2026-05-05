// src/context/CartContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { type Producto } from '../types/Producto';
import { useAuth } from './AuthContext'; 
import { apiService } from '../services/ApiService'; 
import Swal from 'sweetalert2';

interface CartItem {
  producto: Producto;
  cantidad: number;
  stock_local: number; 
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
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const isSyncing = useRef(false);
  const hasLoadedInitial = useRef(false); 
  
  const [cart, setCart] = useState<CartItem[]>([]);

  // 1. INICIALIZACIÓN Y CAMBIOS DE SESIÓN (LOGIN / LOGOUT)
  useEffect(() => {
    if (isAuthenticated) {
      // 🟢 Acaba de loguearse o recargar la página logueado
      syncLocalCartToDB();
    } else {
      if (hasLoadedInitial.current) {
        // 🔴 ACABA DE CERRAR SESIÓN: Limpiamos absolutamente todo al instante
        setCart([]);
        localStorage.removeItem('mg_cart');
        isSyncing.current = false;
      } else {
        // 🟡 PRIMERA CARGA COMO INVITADO: Leemos de localStorage
        const savedCart = localStorage.getItem('mg_cart');
        if (savedCart) setCart(JSON.parse(savedCart));
      }
    }
    hasLoadedInitial.current = true;
  }, [isAuthenticated]);

  // 2. PERSISTENCIA EN TIEMPO REAL (Solo para invitados)
  useEffect(() => {
    // Solo guardamos si no está logueado y ya pasó la carga inicial
    if (!isAuthenticated && hasLoadedInitial.current) {
      localStorage.setItem('mg_cart', JSON.stringify(cart));
    }
  }, [cart, isAuthenticated]);

  // 3. CAMBIO DE SUCURSAL
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'mg_tienda_seleccionada') {
            loadCartFromDB(); // Actualiza precios y stock de todos los items
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isAuthenticated]);

  const syncLocalCartToDB = async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    setLoading(true);

    try {
      const localData = localStorage.getItem('mg_cart');
      const guestItems = localData ? JSON.parse(localData) : [];

      if (guestItems.length > 0) {
        await apiService.syncCarrito(guestItems);
        localStorage.removeItem('mg_cart'); 
      }
      await loadCartFromDB();
    } catch (error) {
      console.error("Error en sincronización:", error);
    } finally {
      isSyncing.current = false;
      setLoading(false);
    }
  };

  const loadCartFromDB = async () => {
    setLoading(true);
    try {
        let itemsParaHidratar = [];

        if (isAuthenticated) {
            const res = await apiService.getCarrito();
            if (res.success && res.data) itemsParaHidratar = res.data;
        } else {
            // Para invitados, leemos lo que hay en el estado local actual o localStorage
            const savedCart = localStorage.getItem('mg_cart');
            if (savedCart) {
                const localItems = JSON.parse(savedCart);
                // Convertimos el formato CartItem[] al formato plano de la DB para procesar igual
                itemsParaHidratar = localItems.map((i: CartItem) => ({ 
                    id_producto: i.producto.id_producto, 
                    cantidad: i.cantidad 
                }));
            }
        }

        if (itemsParaHidratar.length > 0) {
            const ids = itemsParaHidratar.map((item: any) => item.id_producto);
            const prodsRes = await apiService.getProductosBatch(ids);

            if (prodsRes.success && prodsRes.data) {
                const cartHidratado = itemsParaHidratar.map((item: any) => {
                    const infoProducto = prodsRes.data?.find(p => p.id_producto === item.id_producto);
                    if (infoProducto) {
                        const stockDisponible = infoProducto.stock_local ?? 0;
                        const cantidadSolicitada = item.cantidad; 

                        // Ya no modificamos 'cantidadFinal' hacia abajo, ni hacemos upsert a la BD.
                        // Mantenemos lo que el usuario pidió en el estado del carrito.
                        return { 
                            producto: infoProducto, 
                            cantidad: cantidadSolicitada, // Se queda con el 5 aunque haya 0
                            stock_local: stockDisponible  // El componente Cart se encargará de comparar
                        };
                    }
                    return null;
                }).filter((item: CartItem | null): item is CartItem => item !== null);

                setCart(cartHidratado);
            }
        } else {
            setCart([]);
        }
    } catch (error) {
        console.error("Error al cargar carrito:", error);
    } finally {
        setLoading(false);
    }
  };

  const addToCart = async (producto: Producto, cantidad: number) => {
      const existingItem = cart.find(item => item.producto.id_producto === producto.id_producto);
      const nuevaCantidad = existingItem ? existingItem.cantidad + cantidad : cantidad;
      const stockDisponible = producto.stock_local ?? 0;

      if (nuevaCantidad > stockDisponible) {
          showToast(`Stock insuficiente. Solo quedan ${stockDisponible} unidades.`);
          return;
      }

      if (isAuthenticated) {
        try {
          const res = await apiService.upsertCarritoItem(producto.id_producto, nuevaCantidad);
          if (!res.success) throw new Error(res.message);
        } catch (error) {
          showToast('Error de conexión. Intenta de nuevo.');
          return;
        }
      }

      setCart(prevCart => {
        if (existingItem) {
          return prevCart.map(item => 
            item.producto.id_producto === producto.id_producto 
              ? { ...item, cantidad: nuevaCantidad }
              : item
          );
        }
        // Se agrega el campo stock_local para cumplir con la interfaz
        return [...prevCart, { producto, cantidad, stock_local: stockDisponible }];
      });
      showToast('Agregado al carrito');
  };

  const updateQuantity = async (productoId: string, cantidad: number) => {
      if (cantidad < 1) return;
      const itemToUpdate = cart.find(item => item.producto.id_producto === productoId);
      
      if (itemToUpdate) {
          const stockDisponible = itemToUpdate.producto.stock_local ?? 0;
          if (cantidad > stockDisponible) {
              showToast(`Límite de stock alcanzado.`);
              return;
          }

          if (isAuthenticated) {
              try {
                  const res = await apiService.upsertCarritoItem(productoId, cantidad);
                  if (!res.success) throw new Error(res.message);
              } catch (error) {
                  showToast('Error al actualizar la cantidad.');
                  return;
              }
          }

          setCart(prevCart => prevCart.map(item => 
            item.producto.id_producto === productoId ? { ...item, cantidad } : item
          ));
      }
  };

  const removeFromCart = async (productoId: string) => {
    if (isAuthenticated) await apiService.removeFromCarrito(productoId);
    setCart(prevCart => prevCart.filter(item => item.producto.id_producto !== productoId));
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

// ✨ BLINDAJE EN EL CÁLCULO TOTAL
  const totalItems = cart.reduce((total, item) => total + item.cantidad, 0);
  const totalPrice = cart.reduce((total, item) => {
      const precioBase = Number(item.producto.precio_base || 0);
      // Buscamos el descuento bajo ambos nombres para evitar fallos
      const porcentajeDesc = Number(item.producto.descuento_local || (item.producto as any).descuento || 0); 
      const descuentoAplicado = precioBase * (porcentajeDesc / 100);
      
      return total + ((precioBase - descuentoAplicado) * item.cantidad);
  }, 0);

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
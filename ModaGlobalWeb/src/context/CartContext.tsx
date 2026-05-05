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
  addToCart: (producto: Producto, cantidad?: number) => void; // <-- Cambiamos any por Producto
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
      smartSyncCart();
    } else {
      if (hasLoadedInitial.current) {
        setCart([]);
        localStorage.removeItem('mg_cart');
        isSyncing.current = false;
      } else {
        const savedCart = localStorage.getItem('mg_cart');
        if (savedCart) setCart(JSON.parse(savedCart));
      }
    }
    hasLoadedInitial.current = true;
  }, [isAuthenticated]);

  // 2. PERSISTENCIA EN TIEMPO REAL (Solo para invitados)
  useEffect(() => {
    if (!isAuthenticated && hasLoadedInitial.current) {
      localStorage.setItem('mg_cart', JSON.stringify(cart));
    }
  }, [cart, isAuthenticated]);

  // 3. CAMBIO DE SUCURSAL
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'mg_tienda_seleccionada') {
            loadCartFromDB(); 
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isAuthenticated]);

  // ==============================================================
  // 🧠 SINCRONIZACIÓN Y DEDUPLICACIÓN
  // ==============================================================
  const smartSyncCart = async () => {
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
        let itemsParaHidratar: any[] = [];

        if (isAuthenticated) {
            const res = await apiService.getCarrito();
            if (res.success && res.data) itemsParaHidratar = res.data;
        } else {
            const savedCart = localStorage.getItem('mg_cart');
            if (savedCart) {
                const localItems = JSON.parse(savedCart);
                itemsParaHidratar = localItems.map((i: CartItem) => ({ 
                    id_producto: i.producto?.id_producto || (i as any).id_producto, 
                    cantidad: i.cantidad 
                }));
            }
        }

        if (itemsParaHidratar.length > 0) {
            // FUSIÓN: Utilizamos la "Aspiradora de Fantasmas" de Rogelio para unificar IDs duplicados que vengan de la DB
            const mapaDeduplicado = new Map<string, number>();
            itemsParaHidratar.forEach(item => {
                const id = item.id_producto;
                const cant = item.cantidad || 0;
                mapaDeduplicado.set(id, (mapaDeduplicado.get(id) || 0) + cant);
            });

            const ids = Array.from(mapaDeduplicado.keys());
            const prodsRes = await apiService.getProductosBatch(ids);

            if (prodsRes.success && prodsRes.data) {
                const cartHidratado = ids.map(id => {
                    const infoProducto = prodsRes.data?.find(p => p.id_producto === id);
                    if (infoProducto) {
                        const stockDisponible = infoProducto.stock_local ?? 0;
                        const cantidadSolicitada = mapaDeduplicado.get(id) || 1; 

                        return { 
                            producto: infoProducto, 
                            cantidad: cantidadSolicitada, 
                            stock_local: stockDisponible  
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

  const addToCart = async (producto: Producto, cantidad: number = 1) => { // <-- Añadido el "= 1"
      const existingItem = cart.find(item => (item.producto?.id_producto || (item as any).id_producto) === producto.id_producto);
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
            (item.producto?.id_producto || (item as any).id_producto) === producto.id_producto 
              ? { ...item, cantidad: nuevaCantidad }
              : item
          );
        }
        return [...prevCart, { producto, cantidad, stock_local: stockDisponible }];
      });
      showToast('Agregado al carrito');
  };

  const updateQuantity = async (productoId: string, cantidad: number) => {
      if (cantidad < 1) return;
      const itemToUpdate = cart.find(item => (item.producto?.id_producto || (item as any).id_producto) === productoId);
      
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
            (item.producto?.id_producto || (item as any).id_producto) === productoId ? { ...item, cantidad } : item
          ));
      }
  };

  const removeFromCart = async (productoId: string) => {
    if (isAuthenticated) await apiService.removeFromCarrito(productoId);
    setCart(prevCart => prevCart.filter(item => (item.producto?.id_producto || (item as any).id_producto) !== productoId));
  };

  const clearCart = async () => {
    if (isAuthenticated) await apiService.clearCarritoDB();
    setCart([]);
    localStorage.removeItem('mg_cart'); 
  };

  const showToast = (title: string) => {
    Swal.fire({
      toast: true, position: 'bottom-end', icon: 'success', title,
      showConfirmButton: false, timer: 1500, timerProgressBar: true,
      background: '#10b981', color: '#fff'
    });
  };

  // ✨ BLINDAJE EN EL CÁLCULO TOTAL (Mantenemos tu lógica de descuentos)
  const totalItems = cart.reduce((total, item) => total + item.cantidad, 0);
  const totalPrice = cart.reduce((total, item) => {
      const precioBase = Number(item.producto?.precio_base || 0);
      const porcentajeDesc = Number(item.producto?.descuento_local || (item.producto as any)?.descuento || 0); 
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
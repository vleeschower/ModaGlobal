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
      localStorage.removeItem('mg_cart'); // ELIMINAMOS LA MEMORIA LOCAL
      setCart([]); // Vaciamos el estado actual antes de cargar la nube para evitar superposiciones
      await loadCartFromDB();
    } catch (error) {
      console.error("Error al sincronizar carrito:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCartFromDB = async () => {
      try {
        // 1. Pedimos los items básicos al microservicio del carrito
        const res = await apiService.getCarrito();

        if (res.success && res.data && res.data.length > 0) {
          
          // 🚀 2. HIDRATACIÓN OMNICANAL: Consultamos los detalles al microservicio de productos
          const cartPromises = res.data.map(async (item: any) => {
            // Usamos tu servicio existente que ya inyecta el header 'x-tienda-cercana'
            const prodRes = await apiService.getProductoById(item.id_producto);

            if (prodRes.success && prodRes.data) {
              return {
                producto: prodRes.data, // Aquí viene todo: nombre, precio, descuentos, imágenes
                cantidad: item.cantidad
              };
            }
            return null; // Si el producto fue eliminado del catálogo maestro, lo ignoramos
          });

          // 3. Esperamos a que todas las peticiones terminen
          const cartHidratado = await Promise.all(cartPromises);

          // 4. Filtramos los nulos y actualizamos el estado
          setCart(cartHidratado.filter(item => item !== null) as CartItem[]);
        } else {
          setCart([]); // Carrito vacío
        }
      } catch (error) {
        console.error("Error al cargar carrito de DB:", error);
      }
  };

  const addToCart = async (producto: Producto, cantidad: number) => {
      const existingItem = cart.find(item => item.producto.id_producto === producto.id_producto);
      const nuevaCantidad = existingItem ? existingItem.cantidad + cantidad : cantidad;

      // 1. VALIDACIÓN FÍSICA: No vender humo
      if (producto.stock_local !== undefined && nuevaCantidad > producto.stock_local) {
          showToast(`Stock insuficiente. Solo quedan ${producto.stock_local} unidades.`);
          return; // Cortocircuito: No seguimos si no hay stock
      }

      // 2. OPTIMISMO CORREGIDO: Validar con la nube primero
      if (isAuthenticated) {
        try {
          const res = await apiService.upsertCarritoItem(producto.id_producto, nuevaCantidad);
          if (!res.success) throw new Error(res.message); // Forzamos el catch si la API responde con un {success: false}
        } catch (error) {
          console.error("No se pudo guardar en DB", error);
          showToast('Error de conexión. Intenta de nuevo.');
          return; // Cortocircuito: Si la base de datos falla, NO actualizamos el front
        }
      }

      // 3. ACTUALIZACIÓN LOCAL (Solo si pasamos todos los filtros)
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

      // 1. Validar el stock antes de sumar
      const itemToUpdate = cart.find(item => item.producto.id_producto === productoId);
      if (itemToUpdate && itemToUpdate.producto.stock_local !== undefined && cantidad > itemToUpdate.producto.stock_local) {
          showToast(`Límite de stock alcanzado (${itemToUpdate.producto.stock_local} uds).`);
          return;
      }

      // 2. Esperar respuesta de la nube
      if (isAuthenticated) {
          try {
              const res = await apiService.upsertCarritoItem(productoId, cantidad);
              if (!res.success) throw new Error(res.message);
          } catch (error) {
              showToast('Error al actualizar la cantidad.');
              return;
          }
      }

      // 3. Actualizar
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
  const totalPrice = cart.reduce((total, item) => {
      const precioBase = Number(item.producto.precio_base);
      // Calculamos el descuento si existe
      const descuento = item.producto.descuento_local 
          ? precioBase * (item.producto.descuento_local / 100) 
          : 0;
      
      // Total = (Precio - Descuento) * Cantidad
      return total + ((precioBase - descuento) * item.cantidad);
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
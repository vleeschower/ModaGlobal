import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/dashboardLayout';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';

// 📦 Tipos de datos
interface ProductoLocal {
  id_producto: string;
  nombre: string;
  precio_base: number;
  stock_actual: number; 
  imagen_url?: string; 
}

interface CartItem extends ProductoLocal {
  cantidad_carrito: number;
}

const PosDashboard: React.FC = () => {
  const { user } = useAuth();
  const [productos, setProductos] = useState<ProductoLocal[]>([]);
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [cobrando, setCobrando] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api';
  const idTienda = user?.id_tienda; 

  // 1. 🚀 CARGAR PRODUCTOS Y FUSIONAR CON STOCK
  useEffect(() => {
    const fetchProductosSucursal = async () => {
      if (!idTienda) return;
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('mg_token') || '';
        const headers = { 'Authorization': `Bearer ${token}` };

        const resCat = await fetch(`${API_URL}/productos`, { headers });
        const catData = await resCat.json();
        const catalogo = catData.data || catData; 

        const resStock = await fetch(`${API_URL}/inventario/tienda/${idTienda}`, { headers });
        const stockData = await resStock.json();
        const stocks = stockData.data || [];

        const productosFusionados = stocks.map((itemStock: any) => {
          const infoProducto = catalogo.find((p: any) => p.id_producto === itemStock.id_producto);
          if (infoProducto) {
            // ✨ Rescatamos la imagen, ya sea que venga como string o en un arreglo
            const imagen = infoProducto.imagen_url || infoProducto.imagen || (infoProducto.imagenes && infoProducto.imagenes[0]) || '';
            
            return {
              id_producto: infoProducto.id_producto,
              nombre: infoProducto.nombre,
              precio_base: infoProducto.precio_base || infoProducto.precio,
              stock_actual: itemStock.stock_actual,
              imagen_url: imagen
            };
          }
          return null;
        }).filter(Boolean); 

        setProductos(productosFusionados);

      } catch (error) {
        console.error("Error de conexión:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductosSucursal();
  }, [idTienda]);

  // 2. 🛒 LÓGICA DEL CARRITO (Agregar, Quitar y Modificar Cantidad)
  const agregarAlCarrito = (producto: ProductoLocal) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.id_producto === producto.id_producto);
      if (existe) {
        if (existe.cantidad_carrito >= producto.stock_actual) {
          Swal.fire({ icon: 'warning', title: 'Stock límite', text: 'No hay más unidades en físico.' });
          return prev;
        }
        return prev.map(item => item.id_producto === producto.id_producto 
          ? { ...item, cantidad_carrito: item.cantidad_carrito + 1 } : item);
      }
      return [...prev, { ...producto, cantidad_carrito: 1 }];
    });
  };

  const modificarCantidad = (item: CartItem, delta: number) => {
    setCarrito(prev => {
      const nuevaCantidad = item.cantidad_carrito + delta;
      
      // Si la cantidad llega a 0, lo borramos del carrito
      if (nuevaCantidad <= 0) {
        return prev.filter(p => p.id_producto !== item.id_producto);
      }
      
      // Si intenta agregar más del stock que hay físico, lo bloqueamos
      if (nuevaCantidad > item.stock_actual) {
        Swal.fire({ icon: 'warning', title: 'Stock límite', text: 'No hay más unidades en físico.' });
        return prev;
      }

      return prev.map(p => p.id_producto === item.id_producto 
        ? { ...p, cantidad_carrito: nuevaCantidad } : p);
    });
  };

  const quitarDelCarrito = (id_producto: string) => {
    setCarrito(prev => prev.filter(item => item.id_producto !== id_producto));
  };

  // 3. 💵 CÁLCULOS MATEMÁTICOS
  const { total, subtotal, impuestos } = useMemo(() => {
    const t = carrito.reduce((acc, item) => acc + (item.precio_base * item.cantidad_carrito), 0);
    const sub = t / 1.16;
    const imp = t - sub;
    return { total: t, subtotal: sub, impuestos: imp };
  }, [carrito]);

  const productosFiltrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  // 4. 🔥 PROCESAR LA VENTA (COBRAR) Y DESCONTAR DE LA BD
  const handleCobrar = async () => {
    if (carrito.length === 0) return;

    setCobrando(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('mg_token') || '';
      const payload = {
        id_usuario: user?.id,
        id_tienda: idTienda,
        canal: 'LOCAL',
        subtotal: parseFloat(subtotal.toFixed(2)),
        impuestos: parseFloat(impuestos.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        detalles: carrito.map(item => ({
          id_producto: item.id_producto,
          nombre_producto: item.nombre,
          cantidad: item.cantidad_carrito,
          precio_unitario: item.precio_base
        }))
      };

      // 1️⃣ PRIMERO: Guardamos el Ticket en VentasService
      const response = await fetch(`${API_URL}/venta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && !result.error) {
        
        // El ID de la venta que acabamos de crear (para el historial en el Inventario)
        const idVentaRegistrada = result.id_venta || result.data?.id_venta || 'TICKET-LOCAL';

        // 2️⃣ SEGUNDO: Magia Pura ✨ -> Descontamos de la BD SQL uno por uno
        for (const item of carrito) {
          await fetch(`${API_URL}/inventario/ajustar`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              id_producto: item.id_producto,
              cantidad: -Math.abs(item.cantidad_carrito), // ⚠️ CRÍTICO: En negativo para que SQL lo reste
              tipo_movimiento: 'VENTA',
              id_referencia: idVentaRegistrada 
            })
          });
        }

        // 3️⃣ TERCERO: Éxito total y actualizamos la vista
        Swal.fire({ 
          icon: 'success', 
          title: '¡Cobro Exitoso!', 
          text: 'Ticket registrado y stock descontado de la base de datos.', 
          confirmButtonColor: '#10b981' 
        });
        
        setCarrito([]); // Vaciamos la caja
        
        // Descontamos visualmente para no tener que recargar toda la página a la BD
        setProductos(prev => prev.map(p => {
          const itemComprado = carrito.find(c => c.id_producto === p.id_producto);
          return itemComprado ? { ...p, stock_actual: p.stock_actual - itemComprado.cantidad_carrito } : p;
        }).filter(p => p.stock_actual > 0)); 

      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: result.error || 'No se pudo procesar la venta.', confirmButtonColor: '#ef4444' });
      }
    } catch (error) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'Falló la conexión con el servidor.' });
    } finally {
      setCobrando(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col lg:flex-row gap-6">
        
        {/* LADO IZQUIERDO: PRODUCTOS Y BÚSQUEDA */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-orange-500">storefront</span>
              Stock en Sucursal
            </h2>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400">search</span>
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
              />
            </div>
          </div>

          <div className="p-4 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center mt-10">
                <span className="material-symbols-outlined animate-spin text-4xl text-orange-500 mb-2">sync</span>
                <p className="text-gray-500">Cargando productos de la sucursal...</p>
              </div>
            ) : productosFiltrados.length === 0 ? (
                <div className="text-center text-gray-400 mt-10">
                  <span className="material-symbols-outlined text-5xl opacity-50 mb-2">inventory_2</span>
                  <p>No hay productos disponibles en esta sucursal.</p>
                </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {productosFiltrados.map(prod => (
                  <button 
                    key={prod.id_producto}
                    onClick={() => agregarAlCarrito(prod)}
                    className="flex flex-col items-center p-4 border border-gray-100 rounded-2xl hover:border-orange-300 hover:shadow-md transition-all group bg-white text-left text-sm relative overflow-hidden"
                  >
                    {/* ✨ AQUÍ CARGAMOS LA IMAGEN REAL */}
                    {prod.imagen_url ? (
                      <img 
                        src={prod.imagen_url} 
                        alt={prod.nombre} 
                        className="w-16 h-16 object-cover rounded-xl mb-3 group-hover:scale-110 transition-transform shadow-sm"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150'; }} 
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-full mb-3 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-gray-400">checkroom</span>
                      </div>
                    )}

                    <span className="font-bold text-gray-800 line-clamp-2 w-full text-center">{prod.nombre}</span>
                    <span className="text-orange-600 font-black mt-1">${prod.precio_base}</span>
                    <div className="absolute top-2 right-2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded-md">
                      Quedan {prod.stock_actual}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* LADO DERECHO: TICKET DE CAJA */}
        <div className="w-full lg:w-96 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden shrink-0">
          <div className="p-4 bg-gray-900 text-white flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined">receipt_long</span>
              Ticket Actual
            </h2>
            <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">Caja 1</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30">
            {carrito.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <span className="material-symbols-outlined text-5xl mb-2 opacity-50">shopping_cart</span>
                <p>El ticket está vacío</p>
              </div>
            ) : (
              carrito.map(item => (
                <div key={item.id_producto} className="flex flex-col bg-white p-3 border border-gray-200 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-bold text-gray-800 line-clamp-2 pr-2">{item.nombre}</p>
                    <p className="font-black text-gray-900">${(item.precio_base * item.cantidad_carrito).toFixed(2)}</p>
                  </div>
                  
                  {/* ✨ CONTROLES DE CANTIDAD (+ / -) */}
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">${item.precio_base} c/u</p>
                    
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <button 
                        onClick={() => modificarCantidad(item, -1)} 
                        className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-orange-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">remove</span>
                      </button>
                      
                      <span className="w-8 text-center text-sm font-bold text-gray-800">
                        {item.cantidad_carrito}
                      </span>
                      
                      <button 
                        onClick={() => modificarCantidad(item, 1)} 
                        className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-emerald-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                      
                      {/* Botón de eliminar (bote de basura) */}
                      <button 
                        onClick={() => quitarDelCarrito(item.id_producto)} 
                        className="w-7 h-7 ml-2 flex items-center justify-center bg-red-50 rounded shadow-sm text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors"
                        title="Quitar producto"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-100 bg-white space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>IVA (16%)</span>
              <span>${impuestos.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-2xl font-black text-gray-900 pt-2 border-t border-gray-100">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>

            <button
              onClick={handleCobrar}
              disabled={carrito.length === 0 || cobrando}
              className={`w-full mt-4 py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 text-lg
                ${carrito.length === 0 || cobrando 
                  ? 'bg-gray-300 cursor-not-allowed shadow-none text-gray-500' 
                  : 'bg-green-600 hover:bg-green-700 shadow-green-600/30 hover:shadow-green-600/50 active:scale-95'
                }`}
            >
              {cobrando ? (
                <><span className="material-symbols-outlined animate-spin">sync</span> Procesando...</>
              ) : (
                <><span className="material-symbols-outlined">payments</span> COBRAR</>
              )}
            </button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default PosDashboard;
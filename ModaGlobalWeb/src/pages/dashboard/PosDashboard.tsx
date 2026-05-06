import React, { useState, useRef, useMemo } from 'react';
import DashboardLayout from '../../components/dashboardLayout';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import { apiService } from '../../services/ApiService'; 

interface ProductoLocal {
  id_producto: string;
  sku: string;
  nombre: string;
  precio_base: number;
  stock_local: number;     // 👈 Stock físico real para venta
  stock_reservado: number; // 👈 Stock apartado por pedidos web
  imagen_url?: string; 
}

interface CartItem extends ProductoLocal {
  cantidad_carrito: number;
}

const PosDashboard: React.FC = () => {
  const { user } = useAuth();
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [busquedaSku, setBusquedaSku] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [cobrando, setCobrando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const idTienda = user?.id_tienda; 

  // 1. 🔍 BÚSQUEDA Y AGREGADO POR SKU (Simulando pistola de código de barras)
  const buscarYAgregarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✨ LIMPIEZA: Quitamos espacios accidentales al inicio o final
    const skuLimpio = busquedaSku.trim(); 
    
    if (!skuLimpio || !idTienda) return;

    setBuscando(true);
    try {
      localStorage.setItem('mg_tienda_seleccionada', idTienda);
      
      // Usamos el SKU limpio para buscar
      const res = await apiService.getProductosListaAdmin(1, 5, skuLimpio); 
      
      if (res.success && res.data && res.data.length > 0) {
        
        // Comparamos contra el SKU limpio
        const p = res.data.find((item: any) => item.sku.toLowerCase() === skuLimpio.toLowerCase());
        
        if (p) {
          const productoEncontrado: ProductoLocal = {
            id_producto: p.id_producto,
            sku: p.sku,
            nombre: p.nombre,
            precio_base: p.precio_base,
            stock_local: p.stock_local || 0,
            stock_reservado: p.stock_reservado || 0, 
            imagen_url: p.imagen_url
          };

          agregarAlCarrito(productoEncontrado);
          setBusquedaSku(''); 
        } else {
          Swal.fire({ icon: 'warning', title: 'SKU Inexacto', text: `Se encontraron similitudes, pero ningún código exacto para: ${skuLimpio}` });
        }

      } else {
        Swal.fire({ icon: 'error', title: 'No encontrado', text: `No existe ningún producto con el SKU: ${skuLimpio}` });
      }
    } catch (error) {
      console.error("Error buscando SKU:", error);
    } finally {
      setBuscando(false);
      inputRef.current?.focus(); 
    }
  };

  // 2. 🛒 LÓGICA DE VALIDACIÓN ESTRICTA DE CARRITO
  const agregarAlCarrito = (producto: ProductoLocal) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.id_producto === producto.id_producto);
      const cantidadActual = existe ? existe.cantidad_carrito : 0;
      const nuevaCantidad = cantidadActual + 1;

      // 🔥 REGLA DE NEGOCIO: VALIDACIÓN DE STOCK vs RESERVAS
      if (nuevaCantidad > producto.stock_local) {
        if (producto.stock_local === 0 && producto.stock_reservado > 0) {
           Swal.fire({ 
             icon: 'error', 
             title: 'Producto Adquirido en Línea', 
             text: `El producto físico que tienes en mano está reservado para una compra web. No se puede vender en caja.` 
           });
        } else if (producto.stock_local > 0 && producto.stock_reservado > 0) {
           Swal.fire({ 
             icon: 'warning', 
             title: 'Límite Físico Alcanzado', 
             text: `Solo puedes vender ${producto.stock_local}. El producto extra que intentas cobrar pertenece a una reserva web (${producto.stock_reservado} reservados).` 
           });
        } else {
           Swal.fire({ icon: 'error', title: 'Agotado', text: 'El producto está completamente agotado en inventario.' });
        }
        return prev; // Rechazamos el incremento
      }

      // Si pasa las validaciones, lo agregamos/actualizamos
      if (existe) {
        return prev.map(item => item.id_producto === producto.id_producto ? { ...item, cantidad_carrito: nuevaCantidad } : item);
      }
      return [...prev, { ...producto, cantidad_carrito: 1 }];
    });
  };

  const modificarCantidad = (item: CartItem, delta: number) => {
    setCarrito(prev => {
      const nuevaCantidad = item.cantidad_carrito + delta;
      
      if (nuevaCantidad <= 0) return prev.filter(p => p.id_producto !== item.id_producto);
      
      // Misma regla de negocio si suben la cantidad manual con los botones (+ / -)
      if (nuevaCantidad > item.stock_local) {
        if (item.stock_reservado > 0) {
          Swal.fire({ icon: 'warning', title: 'Límite Físico', text: `Llegaste al límite. Los otros ${item.stock_reservado} físicamente presentes están reservados en línea.` });
        } else {
          Swal.fire({ icon: 'warning', title: 'Límite', text: 'No hay más unidades en sistema.' });
        }
        return prev;
      }
      return prev.map(p => p.id_producto === item.id_producto ? { ...p, cantidad_carrito: nuevaCantidad } : p);
    });
  };

  const quitarDelCarrito = (id_producto: string) => {
    setCarrito(prev => prev.filter(item => item.id_producto !== id_producto));
  };

  // 3. 💵 CÁLCULOS
  const { total, subtotal, impuestos } = useMemo(() => {
    const t = carrito.reduce((acc, item) => acc + (item.precio_base * item.cantidad_carrito), 0);
    const sub = t / 1.16;
    return { total: t, subtotal: sub, impuestos: t - sub };
  }, [carrito]);

  // 4. 🔥 PROCESAR LA VENTA
  const handleCobrar = async () => {
    if (carrito.length === 0) return;
    setCobrando(true);
    try {
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

      const result = await apiService.procesarVentaLocal(payload);

      if (result.success) {
        Swal.fire({ icon: 'success', title: '¡Cobro Exitoso!', text: 'Ticket registrado y stock descontado.', confirmButtonColor: '#10b981' });
        setCarrito([]); // Vaciamos la caja
        inputRef.current?.focus(); // Foco listo para el siguiente cliente
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: result.message || 'No se pudo procesar la venta.', confirmButtonColor: '#ef4444' });
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
        
        {/* LADO IZQUIERDO: BÚSQUEDA TIPO ESCÁNER */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col items-center justify-center h-full">
            
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-orange-500 text-4xl">barcode_scanner</span>
            </div>
            
            <h2 className="text-2xl font-black text-gray-800 mb-2">Punto de Venta</h2>
            <p className="text-gray-500 text-center max-w-sm mb-8">
              Escanea el código de barras o ingresa el SKU manualmente para agregar productos al ticket.
            </p>

            <form onSubmit={buscarYAgregarProducto} className="w-full max-w-md relative">
              <span className="material-symbols-outlined absolute left-4 top-4 text-gray-400">search</span>
              <input
                ref={inputRef}
                autoFocus
                type="text"
                placeholder="Ingresar SKU..."
                value={busquedaSku}
                onChange={(e) => setBusquedaSku(e.target.value)}
                disabled={buscando || cobrando}
                className="w-full pl-12 pr-4 py-4 text-lg font-bold bg-white border-2 border-gray-200 rounded-xl outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-200 transition-all uppercase tracking-wider disabled:opacity-50"
              />
              <button 
                type="submit" 
                disabled={buscando || !busquedaSku.trim()}
                className="absolute right-2 top-2 bottom-2 bg-orange-500 text-white px-4 rounded-lg font-bold hover:bg-orange-600 disabled:bg-gray-300 transition-colors"
              >
                {buscando ? '...' : 'AGREGAR'}
              </button>
            </form>

          </div>
        </div>

        {/* LADO DERECHO: TICKET DE CAJA (Mismo código que ya tenías) */}
        <div className="w-full lg:w-450px flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden shrink-0">
          <div className="p-4 bg-gray-900 text-white flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="material-symbols-outlined">receipt_long</span> Ticket
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
                      <button onClick={() => modificarCantidad(item, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-orange-500">
                        <span className="material-symbols-outlined text-[18px]">remove</span>
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-gray-800">{item.cantidad_carrito}</span>
                      <button onClick={() => modificarCantidad(item, 1)} className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:text-emerald-500">
                        <span className="material-symbols-outlined text-[18px]">add</span>
                      </button>
                      <button onClick={() => quitarDelCarrito(item.id_producto)} className="w-7 h-7 ml-2 flex items-center justify-center bg-red-50 rounded shadow-sm text-red-400 hover:text-red-600">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 border-t border-gray-100 bg-white space-y-2">
            <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm text-gray-500"><span>IVA (16%)</span><span>${impuestos.toFixed(2)}</span></div>
            <div className="flex justify-between text-3xl font-black text-gray-900 pt-4 border-t border-gray-100">
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>

            <button
              onClick={handleCobrar}
              disabled={carrito.length === 0 || cobrando}
              className={`w-full mt-6 py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 text-xl tracking-wide
                ${carrito.length === 0 || cobrando ? 'bg-gray-300 cursor-not-allowed shadow-none text-gray-500' : 'bg-green-600 hover:bg-green-700 active:scale-95'}`}
            >
              {cobrando ? <><span className="material-symbols-outlined animate-spin">sync</span> Procesando...</> : <><span className="material-symbols-outlined">payments</span> COBRAR</>}
            </button>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default PosDashboard;
import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/header';
import Footer from '../components/footer';
import { useCart } from '../context/CartContext';

const Cart: React.FC = () => {
  const { cart, updateQuantity, removeFromCart, totalPrice, totalItems } = useCart();
  const carritoTieneErrores = cart.some(item => item.cantidad > (item.stock_local || 0));

  return (
    <div className="bg-[#F8F9FA] min-h-screen flex flex-col font-sans">
      <Header />

      <main className="grow max-w-1440px mx-auto w-full px-4 sm:px-6 md:px-16 py-8 md:py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Tu Carrito</h1>
            <p className="text-gray-500 mt-2">Tienes {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'} en tu pedido.</p>
          </div>
        </div>

        {cart.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-400px">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">shopping_cart</span>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Tu carrito está vacío</h2>
            <p className="text-gray-500 mb-8 max-w-md">Parece que aún no has agregado ningún producto. Descubre nuestro catálogo y encuentra lo que buscas.</p>
            <Link 
              to="/catalogo" 
              className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-esmeralda transition-colors shadow-lg active:scale-95"
            >
              Explorar productos
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* TABLA / LISTA DE PRODUCTOS */}
            <div className="w-full lg:w-2/3 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <div className="hidden md:grid grid-cols-12 gap-4 pb-4 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <div className="col-span-6">Producto</div>
                <div className="col-span-3 text-center">Cantidad</div>
                <div className="col-span-2 text-right">Subtotal</div>
                <div className="col-span-1"></div>
              </div>

              <div className="divide-y divide-gray-100">
                {cart.map((item, index) => {
                  const productId = item.producto?.id_producto || (item as any).id_producto || `temp-id-${index}`;
                  const prod = item.producto || {} as any;
                  
                  const imagenSegura = prod.imagen_url || 'https://dummyimage.com/150x150/f3f4f6/a1a1aa.png&text=Sin+Imagen';
                  const nombreSeguro = prod.nombre || 'Cargando producto...';
                  const categoriaSegura = prod.id_categoria || 'General';
                  const precioBase = Number(prod.precio_base || 0);
                  const descuento = Number(prod.descuento_local || 0);

                  const precioUnitarioReal = precioBase * (1 - descuento / 100);
                  const subtotalFila = precioUnitarioReal * item.cantidad;

                  const stockDisponible = item.stock_local || 0;
                  const hayConflictoStock = item.cantidad > stockDisponible;

                  return (
                    <div key={productId} className={`py-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center relative transition-opacity ${stockDisponible === 0 ? 'opacity-80' : ''}`}>
                      
                      {/* ✨ ALERTA DE STOCK MEJORADA (Ocupa todo el ancho superior) */}
                      {hayConflictoStock && (
                        <div className="col-span-full mb-1">
                          <div className="flex items-start md:items-center gap-3 px-4 py-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 shadow-sm">
                            <span className="material-symbols-outlined text-red-500 shrink-0">
                              {stockDisponible === 0 ? 'remove_shopping_cart' : 'production_quantity_limits'}
                            </span>
                            <p>
                              {stockDisponible === 0 
                                ? <><strong>Agotado en esta sucursal.</strong> Por favor, elimínalo de tu carrito o cambia de tienda para proceder.</>
                                : <><strong>Stock insuficiente.</strong> Solo tenemos {stockDisponible} unidades en esta sucursal. Por favor, ajusta la cantidad.</>}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* COLUMNA 1: Imagen, Nombre y Precio Unitario (6 columnas) */}
                      <div className="col-span-1 md:col-span-6 flex items-center gap-4">
                        <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                          <img 
                            src={imagenSegura} 
                            alt={nombreSeguro} 
                            // ✨ Si el stock es 0, la imagen se pone en escala de grises
                            className={`w-full h-full object-cover mix-blend-multiply transition-all ${stockDisponible === 0 ? 'grayscale' : ''}`}
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://dummyimage.com/150x150/f3f4f6/a1a1aa.png&text=Error'; }}
                          />
                        </div>
                        <div className="flex flex-col pr-4">
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">
                            {categoriaSegura}
                          </span>
                          <Link to={`/producto/${productId}`} className="text-base md:text-lg font-bold text-slate-900 leading-tight hover:text-emerald-600 transition-colors line-clamp-2">
                            {nombreSeguro}
                          </Link>
                          
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-slate-900 font-bold">${precioUnitarioReal.toFixed(2)}</span>
                            {descuento > 0 && (
                              <>
                                <span className="text-gray-400 text-xs line-through">${precioBase.toFixed(2)}</span>
                                <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded font-black">-{descuento}%</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* COLUMNA 2: Controles de Cantidad (3 columnas) */}
                      <div className="col-span-1 md:col-span-3 flex justify-start md:justify-center mt-2 md:mt-0">
                        <div className={`flex items-center border rounded-xl overflow-hidden h-10 w-32 ${hayConflictoStock ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                          <button 
                            onClick={() => updateQuantity(productId, item.cantidad - 1)}
                            className="w-10 h-full hover:bg-gray-200 transition-colors font-bold text-gray-600 flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className={`flex-1 font-bold text-center text-sm ${hayConflictoStock ? 'text-red-600' : 'text-slate-900'}`}>
                            {item.cantidad}
                          </span>
                          <button 
                            onClick={() => updateQuantity(productId, item.cantidad + 1)}
                            className="w-10 h-full hover:bg-gray-200 transition-colors font-bold text-gray-600 flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* COLUMNA 3: Subtotal (2 columnas) */}
                      <div className="col-span-1 md:col-span-2 text-left md:text-right hidden md:block">
                        <span className="text-lg font-black text-slate-900">
                          ${subtotalFila.toFixed(2)}
                        </span>
                      </div>

                      {/* COLUMNA 4: Botón Eliminar (1 columna) */}
                      <div className="col-span-1 md:col-span-1 flex justify-end absolute top-6 right-0 md:relative md:top-auto mt-8 md:mt-0">
                        <button 
                          onClick={() => removeFromCart(productId)}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Eliminar producto"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>

                      {/* Subtotal en Móvil */}
                      <div className="col-span-1 flex justify-between items-center md:hidden mt-2 pt-2 border-t border-gray-50">
                        <span className="text-sm font-medium text-gray-500">Subtotal:</span>
                        <span className="text-lg font-black text-slate-900">${subtotalFila.toFixed(2)}</span>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* TARJETA DE RESUMEN */}
            <div className="w-full lg:w-1/3 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 sticky top-24">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Resumen del pedido</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({totalItems} prod.)</span>
                  <span className="font-medium">${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Costo de envío</span>
                  <span className="font-medium text-emerald-500">Gratis</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6 mb-8">
                <div className="flex justify-between items-end">
                  <span className="text-slate-900 font-bold">Total a pagar</span>
                  <span className="text-3xl font-black text-slate-900">${totalPrice.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-400 text-right mt-1">Impuestos incluidos</p>
              </div>

              <button 
                disabled={carritoTieneErrores}
                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2
                  ${carritoTieneErrores 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' // Estado deshabilitado
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-95' // Estado activo
                  }`}
              >
                <span className="material-symbols-outlined">
                  {carritoTieneErrores ? 'block' : 'lock'}
                </span>
                {carritoTieneErrores ? 'Resuelve los problemas de stock' : 'Proceder al pago'}
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 text-xs font-medium">
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                Pago 100% seguro y encriptado
              </div>
            </div>

          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Cart;
import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/header';
import Footer from '../components/footer';
import { useCart } from '../context/CartContext';

const Cart: React.FC = () => {
  const { cart, updateQuantity, removeFromCart, totalPrice, totalItems } = useCart();

  return (
    <div className="bg-[#F8F9FA] min-h-screen flex flex-col font-sans">
      <Header />

      <main className="grow max-w-[1440px] mx-auto w-full px-4 sm:px-6 md:px-16 py-8 md:py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Tu Carrito</h1>
            <p className="text-gray-500 mt-2">Tienes {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'} en tu pedido.</p>
          </div>
        </div>

        {cart.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px]">
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
                  // --- LÓGICA DE BLINDAJE PARA DATOS DE MICROSERVICIOS ---
                  // 1. Extraemos el ID sin importar si viene plano o anidado
                  const productId = item.producto?.id_producto || (item as any).id_producto || `temp-id-${index}`;
                  
                  // 2. Forzamos a que 'prod' sea al menos un objeto vacío para que no truene el render
                  const prod = item.producto || {} as any;
                  
                  // 3. Variables seguras con valores por defecto (DummyImage es más estable que Placeholder)
                  const imagenSegura = prod.imagen_url || 'https://dummyimage.com/150x150/f3f4f6/a1a1aa.png&text=Sin+Imagen';
                  const nombreSeguro = prod.nombre || 'Cargando producto...';
                  const categoriaSegura = prod.id_categoria || 'General';
                  const precioSeguro = Number(prod.precio_base || 0);

                  return (
                    <div key={productId} className="py-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      
                      {/* Imagen y Nombre */}
                      <div className="col-span-1 md:col-span-6 flex items-center gap-4">
                        <div className="w-24 h-24 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shrink-0">
                          <img 
                            src={imagenSegura} 
                            alt={nombreSeguro} 
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://dummyimage.com/150x150/f3f4f6/a1a1aa.png&text=Error+Img'; }}
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-primary-esmeralda uppercase tracking-widest mb-1">
                            {categoriaSegura}
                          </span>
                          <Link to={`/producto/${productId}`} className="text-lg font-bold text-slate-900 hover:text-primary transition-colors">
                            {nombreSeguro}
                          </Link>
                          <span className="text-gray-500 font-medium mt-1">${precioSeguro.toFixed(2)} c/u</span>
                        </div>
                      </div>

                      {/* Controles de Cantidad */}
                      <div className="col-span-1 md:col-span-3 flex justify-start md:justify-center">
                        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 h-10">
                          <button 
                            onClick={() => updateQuantity(productId, item.cantidad - 1)}
                            className="px-3 h-full hover:bg-gray-200 transition-colors font-bold text-gray-600"
                          >
                            -
                          </button>
                          <span className="px-4 font-bold text-slate-900 text-center text-sm">{item.cantidad}</span>
                          <button 
                            onClick={() => updateQuantity(productId, item.cantidad + 1)}
                            className="px-3 h-full hover:bg-gray-200 transition-colors font-bold text-gray-600"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Subtotal del Item */}
                      <div className="col-span-1 md:col-span-2 text-left md:text-right">
                        <span className="text-lg font-black text-slate-900">
                          ${(precioSeguro * item.cantidad).toFixed(2)}
                        </span>
                      </div>

                      {/* Botón Eliminar */}
                      <div className="col-span-1 md:col-span-1 flex justify-end">
                        <button 
                          onClick={() => removeFromCart(productId)}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Eliminar producto"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
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

              <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-primary-esmeralda transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">lock</span>
                Proceder al pago
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
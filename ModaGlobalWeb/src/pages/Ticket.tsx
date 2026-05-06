import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const Ticket: React.FC = () => {
  const [ticketData, setTicketData] = useState<any>(null);

  useEffect(() => {
    // Leemos el ticket que nos dejó el Checkout
    const dataGuardada = localStorage.getItem('mg_ultimo_ticket');
    if (dataGuardada) {
      setTicketData(JSON.parse(dataGuardada));
    }
  }, []);

  if (!ticketData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">receipt_long</span>
        <h2 className="text-2xl text-gray-600 font-light">No hay ningún ticket reciente.</h2>
        <Link to="/catalogo" className="mt-4 text-emerald-600 hover:underline">Volver a la tienda</Link>
      </div>
    );
  }

  // Formatear la fecha
  const fecha = new Date(ticketData.fecha).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 print:bg-white print:py-0">
      <div className="max-w-xl mx-auto bg-white shadow-xl border border-gray-200 print:shadow-none print:border-none">
        
        {/* Cabecera del Ticket */}
        <div className="bg-[#002727] px-8 py-6 text-center print:bg-white print:text-black print:border-b-2 print:border-black">
          <h1 className="text-3xl font-bold text-white tracking-widest uppercase print:text-black">ModaGlobal</h1>
          <p className="text-emerald-400 text-sm mt-1 print:text-gray-600">Comprobante de Compra</p>
        </div>

        <div className="p-8">
          {/* Info de la Orden */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-6 mb-6">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Orden de Compra</p>
              <p className="text-sm font-mono text-gray-800">{ticketData.id_venta}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Fecha</p>
              <p className="text-sm text-gray-800">{fecha}</p>
            </div>
          </div>

          <div className="mb-6">
             <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Sucursal de Despacho</p>
             <p className="text-sm text-gray-800 font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-emerald-600">store</span>
                {ticketData.tienda}
             </p>
          </div>

          {/* Tabla de Productos */}
          <div className="mb-8">
            <div className="flex border-b-2 border-gray-800 pb-2 mb-4">
              <span className="flex-1 text-xs font-bold text-gray-500 uppercase">Artículo</span>
              <span className="w-16 text-center text-xs font-bold text-gray-500 uppercase">Cant</span>
              <span className="w-24 text-right text-xs font-bold text-gray-500 uppercase">Importe</span>
            </div>
            
            {ticketData.items?.map((item: any, index: number) => (
              <div key={index} className="flex border-b border-dashed border-gray-200 py-3">
                <span className="flex-1 text-sm text-gray-700 pr-4">{item.nombre}</span>
                <span className="w-16 text-center text-sm text-gray-700">{item.cantidad}</span>
                <span className="w-24 text-right text-sm text-gray-700">${(item.precio * item.cantidad).toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Totales */}
          <div className="flex flex-col items-end gap-2 mb-8 border-b border-gray-200 pb-6">
            <div className="flex w-48 justify-between text-sm text-gray-600">
              <span>Subtotal:</span>
              <span>${ticketData.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex w-48 justify-between text-sm text-gray-600">
              <span>IVA (16%):</span>
              <span>${ticketData.impuestos.toFixed(2)}</span>
            </div>
            <div className="flex w-48 justify-between text-xl font-bold text-gray-900 mt-2 pt-2 border-t border-gray-800">
              <span>Total:</span>
              <span>${ticketData.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Código de Recolección */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center mb-8">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Código de Recolección en Tienda</p>
            <p className="text-3xl font-mono font-bold tracking-[0.2em] text-[#002727]">{ticketData.codigo_recoleccion}</p>
            <p className="text-xs text-gray-500 mt-2">Muestra este código al cajero de la sucursal para recibir tu pedido.</p>
          </div>

          {/* Botones de acción (Se ocultan al imprimir) */}
          <div className="flex gap-4 print:hidden">
            <Link to="/catalogo" className="flex-1 text-center py-3 border border-gray-300 rounded text-gray-700 font-semibold hover:bg-gray-50 transition-colors">
              Seguir Comprando
            </Link>
            <button 
              onClick={() => window.print()} 
              className="flex-1 bg-[#002727] text-white py-3 rounded font-semibold hover:bg-[#004040] transition-colors flex justify-center items-center gap-2"
            >
              <span className="material-symbols-outlined">print</span> Imprimir
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Ticket;
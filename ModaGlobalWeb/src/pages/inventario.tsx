import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/dashboardLayout';
import { apiService } from '../services/ApiService';
import Swal from 'sweetalert2';

const Inventario: React.FC = () => {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const [totalPaginas, setTotalPaginas] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(''); 
  
  // ✨ NUEVO: Estado para el ordenamiento
  const [sortOrder, setSortOrder] = useState('newest'); 

  const [surtirModal, setSurtirModal] = useState({ isOpen: false, id_producto: '', nombre: '', cantidad: 10 });
  const [isSurtirLoading, setIsSurtirLoading] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedSearch(searchTerm); setPaginaActual(1); }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const loadInventario = async () => {
    setLoading(true);
    // ✨ ACTUALIZADO: Pasamos sortOrder al servicio
    const result = await apiService.getInventarioRed(paginaActual, 10, debouncedSearch, sortOrder);
    
    if (result.success && result.data) {
      setProductos(result.data);
      if(result.meta) setTotalPaginas(result.meta.total_paginas);
    } else {
      Swal.fire('Error', result.message || 'Error al cargar el inventario.', 'error');
    }
    setLoading(false);
  };

  // ✨ ACTUALIZADO: Recargamos si cambia el ordenamiento
  useEffect(() => { loadInventario(); }, [paginaActual, debouncedSearch, sortOrder]);

  const handleSurtirSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSurtirLoading(true);
    const res = await apiService.solicitarStock(surtirModal.id_producto, surtirModal.cantidad);
    setIsSurtirLoading(false);

    if (res.success) {
        Swal.fire('Solicitud Enviada', res.message, 'success');
        setSurtirModal({ isOpen: false, id_producto: '', nombre: '', cantidad: 10 });
    } else {
        Swal.fire('Error', res.message, 'error');
    }
  };

  const next_page = () => { if (paginaActual < totalPaginas) setPaginaActual(p => p + 1); };
  const prev_page = () => { if (paginaActual > 1) setPaginaActual(p => p - 1); };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-1440px mx-auto font-sans relative">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Logística e Inventario</h1>
            <p className="text-gray-500 mt-1">Supervisa el stock global y solicita reabastecimiento.</p>
          </div>
        </div>

        {/* ✨ ACTUALIZADO: Layout en flex para poner Buscador + Selector */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
                <span className="absolute left-4 top-3 text-gray-400 material-symbols-outlined text-xl">search</span>
                <input 
                    type="text" placeholder="Buscar por SKU o Nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700"
                />
            </div>
            <div className="sm:w-64">
                <select value={sortOrder} onChange={(e) => { setSortOrder(e.target.value); setPaginaActual(1); }} className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer font-medium text-slate-700 transition-all">
                    <option value="newest">Más Recientes</option>
                    <option value="az">Alfabético (A - Z)</option>
                    <option value="za">Alfabético (Z - A)</option>
                </select>
            </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
             <div className="p-20 flex flex-col items-center"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div></div>
          ) : productos.length > 0 ? (
            <div className="overflow-x-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="p-5 font-black text-slate-400 uppercase text-xs">SKU</th>
                    <th className="p-5 font-black text-slate-400 uppercase text-xs">Producto</th>
                    <th className="p-5 font-black text-slate-400 uppercase text-xs text-center">Mi Sucursal</th>
                    <th className="p-5 font-black text-slate-400 uppercase text-xs text-center">Sede Central</th>
                    <th className="p-5 font-black text-slate-400 uppercase text-xs text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {productos.map((prod) => (
                    <tr key={prod.id_producto} className="hover:bg-gray-50 transition-colors">
                        <td className="p-5 font-medium text-slate-500">{prod.sku || 'N/A'}</td>
                        <td className="p-5 font-bold text-slate-900 flex items-center gap-3">
                            <img src={prod.imagen_url || 'https://via.placeholder.com/50'} alt="img" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                            {prod.nombre}
                        </td>
                        <td className="p-5 text-center">
                            <span className={`px-3 py-1 rounded-md font-bold ${prod.stock_local > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                {prod.stock_local} uds.
                            </span>
                        </td>
                        <td className="p-5 text-center font-mono text-gray-500">{prod.stock_matriz} uds.</td>
                        <td className="p-5 text-right">
                            <button onClick={() => setSurtirModal({ isOpen: true, id_producto: prod.id_producto, nombre: prod.nombre, cantidad: 10 })} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors font-bold text-xs flex items-center gap-1 ml-auto">
                              <span className="material-symbols-outlined text-[14px]">local_shipping</span> Surtir
                            </button>
                        </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPaginas > 1 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <button onClick={prev_page} disabled={paginaActual === 1} className="px-4 py-2 hover:bg-gray-100 rounded-lg font-bold text-sm disabled:opacity-50">Anterior</button>
                      <span className="text-sm font-medium text-gray-500">Pág {paginaActual} de {totalPaginas}</span>
                      <button onClick={next_page} disabled={paginaActual === totalPaginas} className="px-4 py-2 hover:bg-gray-100 rounded-lg font-bold text-sm disabled:opacity-50">Siguiente</button>
                  </div>
              )}
            </div>
          ) : (
            <div className="p-20 text-center text-gray-500 font-bold bg-gray-50 border border-dashed m-6 rounded-2xl">Catálogo vacío.</div>
          )}
        </div>

        {/* MODAL SURTIR */}
        {surtirModal.isOpen && (
            <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-3xl">inventory_2</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Solicitar Stock</h3>
                    <p className="text-gray-500 mb-6 text-sm">¿Cuántas unidades de <strong className="text-slate-800">{surtirModal.nombre}</strong> necesitas?</p>
                    <form onSubmit={handleSurtirSubmit}>
                        <div className="mb-6 text-left">
                            <input type="number" min="1" max="1000" required value={surtirModal.cantidad} onChange={(e) => setSurtirModal({...surtirModal, cantidad: parseInt(e.target.value) || 1})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-emerald-500 font-black text-xl text-center" />
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setSurtirModal({ ...surtirModal, isOpen: false })} disabled={isSurtirLoading} className="flex-1 bg-gray-100 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50">Cancelar</button>
                            <button type="submit" disabled={isSurtirLoading} className="flex-1 bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 shadow-lg transition-colors disabled:opacity-50"> {isSurtirLoading ? '...' : 'Pedir'} </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Inventario;
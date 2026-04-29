import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/dashboardLayout';
import { apiService } from '../../services/ApiService';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';

const AdminProductList: React.FC = () => {
  const { isSuperAdmin, isAdmin } = useAuth(); 

  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contexto, setContexto] = useState('');
  
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const [totalPaginas, setTotalPaginas] = useState<number>(1);
  const limitePorPagina = 10; 
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(''); 
  const [sortOrder, setSortOrder] = useState('newest');

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: '', nombre: '', imageUrl: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // MODAL DE PROMOCIONES Y DETALLES
  const [promoModal, setPromoModal] = useState({ isOpen: false, id_producto: '', nombre: '', precio_base: 0 });
  const [promoFormData, setPromoFormData] = useState<{descuento: number | string, fecha_inicio: string, fecha_fin: string}>({ descuento: '', fecha_inicio: '', fecha_fin: '' });
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [promoDetailsModal, setPromoDetailsModal] = useState({ isOpen: false, nombre: '', precioOriginal: 0, precioFinal: 0, descuento: 0, fecha_inicio: '', fecha_fin: '' });

  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedSearch(searchTerm); setPaginaActual(1); }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const cargarProductos = async () => {
    setLoading(true);
    const res = await apiService.getProductosListaAdmin(paginaActual, limitePorPagina, debouncedSearch, sortOrder);
    if (res.success && res.data) {
      setProductos(res.data);
      setContexto(res.contexto || 'Gestión'); 
      if (res.meta) setTotalPaginas(res.meta.total_paginas);
    }
    setLoading(false);
  };

  useEffect(() => { cargarProductos(); }, [paginaActual, debouncedSearch, sortOrder]);

  const triggerDelete = (id: string, nombre: string, imageUrl: string) => setDeleteModal({ isOpen: true, id, nombre, imageUrl });

  const confirmDelete = async () => {
    setIsDeleting(true);
    const res = await apiService.eliminarProducto(deleteModal.id);
    setIsDeleting(false);
    if (res.success) {
      setDeleteModal({ isOpen: false, id: '', nombre: '', imageUrl: '' });
      cargarProductos(); 
    } else {
      Swal.fire('Error', res.message || 'Error al eliminar', 'error');
    }
  };

  const abrirModalPromo = (prod: any) => {
    const formatForInput = (dateStr: string | null) => dateStr ? new Date(new Date(dateStr).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
    const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setPromoFormData({ descuento: prod.descuento || '', fecha_inicio: prod.fecha_inicio ? formatForInput(prod.fecha_inicio) : now.toISOString().slice(0, 16), fecha_fin: prod.promo_fin ? formatForInput(prod.promo_fin) : '' });
    setPromoModal({ isOpen: true, id_producto: prod.id_producto, nombre: prod.nombre, precio_base: prod.precio_base });
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    const res = await apiService.guardarPromocion(promoModal.id_producto, Number(promoFormData.descuento), promoFormData.fecha_inicio, promoFormData.fecha_fin);
    setIsActionLoading(false);
    if (res.success) {
        Swal.fire('¡Éxito!', 'Promoción aplicada', 'success');
        setPromoModal({ ...promoModal, isOpen: false });
        cargarProductos();
    } else {
        Swal.fire('Error', res.message || 'Hubo un error al guardar', 'error');
    }
  };

  const abrirDetallesOferta = (prod: any, precioOriginal: number, precioFinal: number) => {
      setPromoDetailsModal({ isOpen: true, nombre: prod.nombre, precioOriginal, precioFinal, descuento: prod.descuento, fecha_inicio: prod.promo_inicio, fecha_fin: prod.promo_fin });
  };

  const next_page = () => { if (paginaActual < totalPaginas) setPaginaActual(p => p + 1); };
  const prev_page = () => { if (paginaActual > 1) setPaginaActual(p => p - 1); };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-1440px mx-auto font-sans relative">
        <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Catálogo y Marketing</h1>
            <p className="text-emerald-600 font-bold mt-1 uppercase text-xs">{contexto}</p>
          </div>
          {isSuperAdmin && (
            <Link to="/dashboard/producto/nuevo" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-500 transition-colors shadow-lg active:scale-95">
              <span className="material-symbols-outlined">add_circle</span> Nuevo Producto
            </Link>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
                <span className="absolute left-4 top-3 text-gray-400 material-symbols-outlined text-xl">search</span>
                <input type="text" placeholder="Buscar por nombre o SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700" />
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
             <div className="p-20 flex flex-col items-center"><div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div><p className="text-gray-500 font-bold">Cargando catálogo...</p></div>
          ) : productos.length === 0 ? (
            <div className="p-20 text-center text-gray-500 font-bold bg-gray-50 border border-dashed border-gray-200 m-6 rounded-2xl">No se encontraron productos que coincidan con tu búsqueda.</div>
          ) : (
            <div className="overflow-x-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="p-5 font-black text-slate-400 uppercase text-xs rounded-tl-xl">SKU</th>
                    <th className="p-5 font-black text-slate-400 uppercase text-xs">Producto</th>
                    <th className="p-5 font-black text-slate-400 uppercase text-xs text-center">Precio</th>
                    <th className="p-5 font-black text-slate-400 uppercase text-xs text-center">Descuento</th>
                    <th className="p-5 font-black text-slate-400 uppercase text-xs text-center">Precio Final</th>
                    <th className="p-5 font-black text-slate-400 uppercase text-xs text-right rounded-tr-xl">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {productos.map((prod) => {
                    const hasPromo = prod.descuento && prod.descuento > 0;
                    const precioOriginal = Number(prod.precio_base);
                    const precioFinal = hasPromo ? precioOriginal - (precioOriginal * (Number(prod.descuento) / 100)) : precioOriginal;

                    return (
                        <tr key={prod.id_producto} className="hover:bg-gray-50 transition-colors">
                        <td className="p-5 text-sm font-medium text-slate-500">{prod.sku || 'N/A'}</td>
                        <td className="p-5">
                            <p className="text-sm font-bold text-slate-900">{prod.nombre}</p>
                            {hasPromo && (
                                <button onClick={() => abrirDetallesOferta(prod, precioOriginal, precioFinal)} className="inline-flex mt-1 items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-1 rounded-md uppercase cursor-pointer hover:bg-amber-200 transition-colors">
                                    <span className="material-symbols-outlined text-[12px]">info</span> Oferta Activa
                                </button>
                            )}
                        </td>
                        <td className="p-5 text-center text-sm font-bold text-slate-700">
                            ${precioOriginal.toFixed(2)}
                        </td>
                        <td className="p-5 text-center">
                            {hasPromo ? (
                                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-black">-{prod.descuento}%</span>
                            ) : (
                                <span className="text-gray-400">-</span>
                            )}
                        </td>
                        <td className="p-5 text-center text-sm font-black text-emerald-600">
                            ${precioFinal.toFixed(2)}
                        </td>
                        <td className="p-5 flex items-center justify-end gap-2">
                            {isSuperAdmin && (
                                <>
                                    <Link to={`/dashboard/producto/editar/${prod.id_producto}`} className="p-1.5 text-gray-400 hover:text-emerald-500 transition-colors" title="Editar"><span className="material-symbols-outlined text-lg">edit</span></Link>
                                    <button onClick={() => triggerDelete(prod.id_producto, prod.nombre, prod.imagen_url)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Eliminar"><span className="material-symbols-outlined text-lg">delete</span></button>
                                </>
                            )}
                            {(isAdmin || isSuperAdmin) && (
                                <button onClick={() => abrirModalPromo(prod)} className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-500 hover:text-white font-bold text-xs flex items-center gap-1 transition-colors">
                                    <span className="material-symbols-outlined text-[14px]">sell</span>Promo
                                </button>
                            )}
                        </td>
                        </tr>
                    );
                  })}
                </tbody>
              </table>
              {totalPaginas > 1 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <button onClick={prev_page} disabled={paginaActual === 1} className="flex items-center gap-1 px-4 py-2 hover:bg-gray-100 rounded-lg font-bold text-sm disabled:opacity-50 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">chevron_left</span> Anterior
                      </button>
                      <span className="text-sm font-medium text-gray-500">Página {paginaActual} de {totalPaginas}</span>
                      <button onClick={next_page} disabled={paginaActual === totalPaginas} className="flex items-center gap-1 px-4 py-2 hover:bg-gray-100 rounded-lg font-bold text-sm disabled:opacity-50 transition-colors">
                          Siguiente <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </button>
                  </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL ELIMINAR */}
        {deleteModal.isOpen && (
            <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-3xl">delete</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">¿Eliminar producto?</h3>
                    <p className="text-gray-500 mb-6 text-sm">Esta acción eliminará el producto de la base de datos.</p>
                    <div className="bg-gray-50 p-3 rounded-xl flex items-center gap-4 mb-8 text-left border border-gray-100">
                        <img src={deleteModal.imageUrl || 'https://via.placeholder.com/500?text=Sin+Imagen'} alt={deleteModal.nombre} className="w-12 h-12 rounded-lg object-cover bg-white" />
                        <span className="font-bold text-slate-700 text-sm line-clamp-2">{deleteModal.nombre}</span>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setDeleteModal({ isOpen: false, id: '', nombre: '', imageUrl: '' })} disabled={isDeleting} className="flex-1 bg-gray-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50">Cancelar</button>
                        <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors shadow-lg active:scale-95 disabled:opacity-50">
                            {isDeleting ? '...' : 'Eliminar'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL APLICAR PROMOCIÓN */}
        {promoModal.isOpen && (
            <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-3xl">sell</span>
                    </div>
                    <h3 className="text-xl font-black text-center text-slate-900 mb-2">Aplicar Descuento</h3>
                    <p className="text-gray-500 text-center text-sm mb-6 line-clamp-2">{promoModal.nombre}</p>

                    <form onSubmit={handleSavePromo} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Porcentaje de Descuento (%)</label>
                            <input 
                                type="number" min="1" max="100" step="0.01" required placeholder="Ej. 15"
                                value={promoFormData.descuento} 
                                onChange={e => setPromoFormData({...promoFormData, descuento: e.target.value})} 
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-amber-500 text-xl font-black text-center text-amber-600 transition-all" 
                            />
                            {Number(promoFormData.descuento) > 0 && (
                                <p className="text-xs text-center text-emerald-600 font-bold mt-2">
                                    Precio final aprox: ${(promoModal.precio_base - (promoModal.precio_base * (Number(promoFormData.descuento) / 100))).toFixed(2)}
                                </p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Inicio</label>
                                <input type="datetime-local" required value={promoFormData.fecha_inicio} onChange={e => setPromoFormData({...promoFormData, fecha_inicio: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-amber-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fin</label>
                                <input type="datetime-local" required value={promoFormData.fecha_fin} onChange={e => setPromoFormData({...promoFormData, fecha_fin: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-amber-500" />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                            <button type="button" onClick={() => setPromoModal({...promoModal, isOpen: false})} disabled={isActionLoading} className="flex-1 bg-gray-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50">Cancelar</button>
                            <button type="submit" disabled={isActionLoading} className="flex-1 bg-amber-500 text-white font-bold py-3 rounded-xl hover:bg-amber-600 shadow-lg active:scale-95 disabled:opacity-50 transition-all">
                                {isActionLoading ? '...' : 'Aplicar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL DETALLES DE OFERTA */}
        {promoDetailsModal.isOpen && (
            <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-4 -right-4 w-24 h-24 bg-amber-50 rounded-full blur-2xl z-0 pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-3xl">loyalty</span>
                        </div>
                        <h3 className="text-xl font-black text-center text-slate-900 mb-2">Detalles de la Oferta</h3>
                        <p className="text-gray-500 text-center text-sm mb-6 line-clamp-2">{promoDetailsModal.nombre}</p>

                        <div className="space-y-4 bg-gray-50 p-5 rounded-2xl border border-gray-100">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-500 uppercase">Descuento</span>
                                <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-xs font-black">
                                    -{promoDetailsModal.descuento}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-gray-500 uppercase">Precio Original</span>
                                <span className="text-slate-400 line-through font-bold text-sm">
                                    ${promoDetailsModal.precioOriginal.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-900 uppercase">Precio de Oferta</span>
                                <span className="text-emerald-600 font-black text-xl">
                                    ${promoDetailsModal.precioFinal.toFixed(2)}
                                </span>
                            </div>

                            <hr className="border-gray-200 border-dashed my-2" />
                            
                            <div className="flex flex-col gap-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase text-center tracking-widest">Vigencia</span>
                                <div className="flex justify-between items-center text-xs font-medium text-slate-600 bg-white p-2 rounded-lg border border-gray-100">
                                    <span className="text-gray-400 font-bold w-10">Del:</span>
                                    <span>
                                        {new Date(promoDetailsModal.fecha_inicio).toLocaleDateString()} 
                                        <span className="ml-2 text-gray-400">{new Date(promoDetailsModal.fecha_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-medium text-slate-600 bg-white p-2 rounded-lg border border-gray-100">
                                    <span className="text-gray-400 font-bold w-10">Al:</span>
                                    <span className={new Date(promoDetailsModal.fecha_fin) < new Date() ? "text-red-500 font-bold" : ""}>
                                        {new Date(promoDetailsModal.fecha_fin).toLocaleDateString()} 
                                        <span className="ml-2 text-gray-400">{new Date(promoDetailsModal.fecha_fin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6">
                            <button onClick={() => setPromoDetailsModal({...promoDetailsModal, isOpen: false})} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-colors shadow-lg active:scale-95">
                                Cerrar Detalles
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminProductList;
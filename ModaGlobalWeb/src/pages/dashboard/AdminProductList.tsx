import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/dashboardLayout';
import { apiService } from '../../services/ApiService';
import { useAuth } from '../../context/AuthContext'; 

const AdminProductList: React.FC = () => {
  const { isSuperAdmin, isAdmin } = useAuth(); 
  const navigate = useNavigate();

  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contexto, setContexto] = useState('');
  
  // Estados de Paginación
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const [totalPaginas, setTotalPaginas] = useState<number>(1);
  const limitePorPagina = 10; 

  // ✨ NUEVO: Estados de Búsqueda y Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(''); // Para no hacer peticiones en cada tecla
  const [sortOrder, setSortOrder] = useState('newest');

  const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, id: string, nombre: string, imageUrl: string}>({ isOpen: false, id: '', nombre: '', imageUrl: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Efecto Debounce para la búsqueda (Espera 500ms después de que dejes de escribir)
  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedSearch(searchTerm);
        setPaginaActual(1); // Regresar a la página 1 al buscar
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const cargarProductos = async () => {
    setLoading(true);
    // Enviamos página, límite, búsqueda y orden
    const res = await apiService.getProductosListaAdmin(paginaActual, limitePorPagina, debouncedSearch, sortOrder);
    if (res.success && res.data) {
      setProductos(res.data);
      setContexto(res.contexto || 'Gestión'); 
      if (res.meta) setTotalPaginas(res.meta.total_paginas);
    } else {
      alert(res.message || 'Error al cargar el catálogo.');
    }
    setLoading(false);
  };

  // Recargar cuando cambie la página, la búsqueda o el orden
  useEffect(() => {
    cargarProductos();
  }, [paginaActual, debouncedSearch, sortOrder]);

  const triggerDelete = (id: string, nombre: string, imageUrl: string) => {
    setDeleteModal({ isOpen: true, id, nombre, imageUrl });
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    const res = await apiService.eliminarProducto(deleteModal.id);
    
    if (res.success) {
      setDeleteModal({ isOpen: false, id: '', nombre: '', imageUrl: '' });
      if (productos.length === 1 && paginaActual > 1) {
          setPaginaActual(paginaActual - 1);
      } else {
          cargarProductos(); 
      }
    } else {
      alert(res.message || 'Hubo un error al eliminar');
    }
    setIsDeleting(false);
  };

  const next_page = () => { if (paginaActual < totalPaginas) setPaginaActual(p => p + 1); };
  const prev_page = () => { if (paginaActual > 1) setPaginaActual(p => p - 1); };

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 max-w-1440px mx-auto font-sans relative">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              {isSuperAdmin ? 'Catálogo Maestro' : 'Inventario de Sucursal'}
            </h1>
            <p className="text-emerald-600 font-bold mt-1 uppercase tracking-widest text-xs">{contexto}</p>
          </div>
          
          {isSuperAdmin && (
            <Link 
              to="/dashboard/producto/nuevo" 
              className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-500 transition-colors shadow-lg active:scale-95 flex items-center gap-2"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Nuevo Producto Global
            </Link>
          )}
        </div>

        {/* ✨ BARRA DE CONTROLES (Búsqueda y Filtro) ✨ */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
                <span className="absolute left-4 top-3 text-gray-400 material-symbols-outlined text-xl">search</span>
                <input 
                    type="text"
                    placeholder="Buscar por nombre o SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700"
                />
            </div>
            <div className="sm:w-64">
                <select 
                    value={sortOrder}
                    onChange={(e) => { setSortOrder(e.target.value); setPaginaActual(1); }}
                    className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700 cursor-pointer"
                >
                    <option value="newest">Más Recientes</option>
                    <option value="az">Alfabético (A - Z)</option>
                    <option value="za">Alfabético (Z - A)</option>
                </select>
            </div>
        </div>

        {/* Tabla de Datos */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-bold">Cargando base de datos...</p>
            </div>
          ) : productos.length === 0 ? (
            <div className="p-20 text-center text-gray-500 font-bold bg-gray-50 border border-dashed border-gray-200 m-6 rounded-2xl">
                No se encontraron productos que coincidan con tu búsqueda.
            </div>
          ) : (
            <div className="overflow-x-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="p-5 font-black text-slate-400 uppercase tracking-wider text-xs rounded-tl-xl">SKU</th>
                    <th className="p-5 font-black text-slate-400 uppercase tracking-wider text-xs">Nombre del Producto</th>
                    {isSuperAdmin && <th className="p-5 font-black text-slate-400 uppercase tracking-wider text-xs">Precio Base</th>}
                    {isAdmin && !isSuperAdmin && <th className="p-5 font-black text-emerald-600 uppercase tracking-wider text-xs bg-emerald-50/50">Stock Físico</th>}
                    <th className="p-5 font-black text-slate-400 uppercase tracking-wider text-xs text-right rounded-tr-xl">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {productos.map((prod) => (
                    <tr key={prod.id_producto} className="hover:bg-gray-50 transition-colors">
                      <td className="p-5 text-sm font-medium text-slate-500">{prod.sku || 'N/A'}</td>
                      <td className="p-5 text-sm font-bold text-slate-900">{prod.nombre}</td>
                      
                      {isSuperAdmin && <td className="p-5 text-sm font-bold text-slate-700">${Number(prod.precio_base).toFixed(2)}</td>}
                      
                      {isAdmin && !isSuperAdmin && (
                        <td className="p-5 text-sm font-black text-slate-900 bg-emerald-50/20">
                          {prod.stock_local > 0 ? (
                            <span className="text-emerald-600">{prod.stock_local} uds.</span>
                          ) : (
                            <span className="text-red-500 bg-red-50 px-2 py-1 rounded-md text-xs">Agotado</span>
                          )}
                        </td>
                      )}

                      <td className="p-5 flex justify-end gap-2">
                        {isSuperAdmin && (
                          <>
                            <Link to={`/dashboard/producto/editar/${prod.id_producto}`} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 hover:text-slate-900 transition-colors font-bold text-xs">
                              Editar
                            </Link>
                            <button onClick={() => triggerDelete(prod.id_producto, prod.nombre, prod.imagen_url)} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition-colors font-bold text-xs">
                              Eliminar
                            </button>
                          </>
                        )}
                        {isAdmin && !isSuperAdmin && (
                          <>
                            <button onClick={() => navigate('/dashboard/inventario')} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-500 hover:text-white transition-colors font-bold text-xs flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">inventory_2</span>Surtir
                            </button>
                            <button onClick={() => navigate('/dashboard/promociones')} className="px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-500 hover:text-white transition-colors font-bold text-xs flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">local_offer</span>Promo
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Controles de Paginación */}
              {totalPaginas > 1 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <button onClick={prev_page} disabled={paginaActual === 1} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-slate-800">
                          <span className="material-symbols-outlined text-sm">arrow_back</span> Anterior
                      </button>
                      <span className="text-sm text-gray-500 font-medium">Página {paginaActual} de {totalPaginas}</span>
                      <button onClick={next_page} disabled={paginaActual === totalPaginas} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-slate-800">
                          Siguiente <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                  </div>
              )}

            </div>
          )}
        </div>

        {/* Modal de Eliminación */}
        {deleteModal.isOpen && (
            <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transform transition-all scale-100 opacity-100">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">¿Eliminar producto?</h3>
                    <p className="text-gray-500 mb-6 text-sm">Esta acción eliminará el producto de la base de datos nacional de ModaGlobal.</p>
                    <div className="bg-gray-50 p-3 rounded-xl flex items-center gap-4 mb-8 text-left border border-gray-100">
                        <img 
                          src={deleteModal.imageUrl || 'https://via.placeholder.com/500?text=Sin+Imagen'} 
                          alt={deleteModal.nombre} 
                          className="w-12 h-12 rounded-lg object-cover bg-white" 
                        />
                        <span className="font-bold text-slate-700 text-sm line-clamp-2">{deleteModal.nombre}</span>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setDeleteModal({ isOpen: false, id: '', nombre: '', imageUrl: '' })}
                            disabled={isDeleting}
                            className="flex-1 bg-gray-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmDelete}
                            disabled={isDeleting}
                            className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center"
                        >
                            {isDeleting ? 'Borrando...' : 'Sí, eliminar'}
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default AdminProductList;
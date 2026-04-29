import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/dashboardLayout';
import { apiService } from '../../services/ApiService';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';

const TiendasDashboard: React.FC = () => {
    const { isSuperAdmin, user } = useAuth();
    const [tiendas, setTiendas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // ✨ Estados de Paginación, Búsqueda y Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [regionFilter, setRegionFilter] = useState('');
    
    const [paginaActual, setPaginaActual] = useState<number>(1);
    const [totalPaginas, setTotalPaginas] = useState<number>(1);
    const limitePorPagina = 9; // 9 es perfecto para un grid de 3x3

    // Efecto Debounce para la búsqueda (Espera 500ms después de escribir)
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPaginaActual(1); // Regresar a la página 1 al buscar
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const fetchTiendas = async () => {
        setLoading(true);
        const res = await apiService.getTiendasPaginadas(paginaActual, debouncedSearch, regionFilter);
        if (res.success && res.data) {
            setTiendas(res.data);
            if (res.meta) setTotalPaginas(res.meta.total_paginas);
        } else {
            Swal.fire('Error', res.message || 'No se pudieron cargar las tiendas', 'error');
        }
        setLoading(false);
    };

    // Recargar cuando cambie la página, búsqueda o región
    useEffect(() => { 
        fetchTiendas(); 
    }, [paginaActual, debouncedSearch, regionFilter]);

    // Funciones de Paginación
    const next_page = () => { if (paginaActual < totalPaginas) setPaginaActual(p => p + 1); };
    const prev_page = () => { if (paginaActual > 1) setPaginaActual(p => p - 1); };

    return (
        <DashboardLayout>
            <div className="p-6 md:p-10 max-w-1440px mx-auto font-sans relative">
                
                {/* Encabezado */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900">
                            {isSuperAdmin ? 'Red de Sucursales' : 'Mi Sucursal'}
                        </h1>
                        <p className="text-gray-500 mt-1">Gestión de puntos de venta físicos y almacenes.</p>
                    </div>
                    {isSuperAdmin && (
                        <button className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-500 transition-colors shadow-lg active:scale-95 flex items-center gap-2">
                            <span className="material-symbols-outlined">add_business</span>
                            Nueva Tienda
                        </button>
                    )}
                </div>

                {/* BARRA DE CONTROLES (Solo visible para SuperAdmin) */}
                {isSuperAdmin && (
                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                        <div className="relative flex-1">
                            <span className="absolute left-4 top-3 text-gray-400 material-symbols-outlined text-xl">search</span>
                            <input 
                                type="text"
                                placeholder="Buscar sucursal por nombre o dirección..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700"
                            />
                        </div>
                        <div className="sm:w-64">
                            <select 
                                value={regionFilter}
                                onChange={(e) => { setRegionFilter(e.target.value); setPaginaActual(1); }}
                                className="w-full bg-white border border-gray-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium text-slate-700 cursor-pointer"
                            >
                                <option value="">Todas las regiones</option>
                                <option value="Norte">Norte</option>
                                <option value="Centro">Centro</option>
                                <option value="Sur">Sur</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* GRID DE TIENDAS */}
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-sm">
                        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 font-bold">Cargando sucursales...</p>
                    </div>
                ) : tiendas.length === 0 ? (
                    <div className="p-20 text-center text-gray-500 font-bold bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
                        No se encontraron tiendas que coincidan con tu búsqueda.
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            {tiendas.map(tienda => (
                                <div key={tienda.id_tienda} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-5">
                                        <span className="material-symbols-outlined text-3xl">storefront</span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 leading-tight mb-2 line-clamp-1" title={tienda.nombre}>
                                        {tienda.nombre}
                                    </h3>
                                    <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg uppercase tracking-wider mb-4">
                                        {tienda.region || 'Sin Región'}
                                    </span>
                                    <p className="text-sm text-gray-500 flex items-start gap-2 mb-6 h-10 line-clamp-2" title={tienda.direccion}>
                                        <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">location_on</span>
                                        {tienda.direccion || 'Dirección no especificada'}
                                    </p>
                                    <div className="flex gap-2">
                                        <button className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-emerald-500 transition-colors shadow-lg active:scale-95">
                                            Ver Inventario
                                        </button>
                                        {isSuperAdmin && (
                                            <button className="p-2.5 border border-gray-200 text-gray-400 rounded-xl hover:text-emerald-500 hover:border-emerald-500 transition-colors active:scale-95">
                                                <span className="material-symbols-outlined text-sm">edit</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* CONTROLES DE PAGINACIÓN */}
                        {totalPaginas > 1 && (
                            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                                <button 
                                    onClick={prev_page} disabled={paginaActual === 1} 
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-slate-800"
                                >
                                    <span className="material-symbols-outlined text-sm">arrow_back</span> Anterior
                                </button>
                                <span className="text-sm text-gray-500 font-medium">Página {paginaActual} de {totalPaginas}</span>
                                <button 
                                    onClick={next_page} disabled={paginaActual === totalPaginas} 
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-slate-800"
                                >
                                    Siguiente <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </DashboardLayout>
    );
};

export default TiendasDashboard;
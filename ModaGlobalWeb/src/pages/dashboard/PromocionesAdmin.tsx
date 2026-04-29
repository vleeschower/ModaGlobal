import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/dashboardLayout';
import { apiService } from '../../services/ApiService';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';

const AdminPromociones: React.FC = () => {
    // Solo extraemos isSuperAdmin, quitamos 'user' para evitar el error de variable no usada
    const { isSuperAdmin } = useAuth();
    
    const [productos, setProductos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Paginación y Búsqueda
    const [paginaActual, setPaginaActual] = useState<number>(1);
    const [totalPaginas, setTotalPaginas] = useState<number>(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Modal de Promoción
    const [promoModal, setPromoModal] = useState<{isOpen: boolean, id_producto: string, nombre: string, precio_base: number}>({ isOpen: false, id_producto: '', nombre: '', precio_base: 0 });
    const [formData, setFormData] = useState({ descuento: 0, fecha_inicio: '', fecha_fin: '' });
    const [isSaving, setIsSaving] = useState(false);

    // Efecto Debounce para búsqueda
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedSearch(searchTerm); setPaginaActual(1); }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Carga de datos
    const cargarProductos = async () => {
        setLoading(true);
        const res = await apiService.getPromocionesAdmin(paginaActual, 10, debouncedSearch, 'newest');
        if (res.success && res.data) {
            setProductos(res.data);
            if (res.meta) setTotalPaginas(res.meta.total_paginas);
        } else {
            Swal.fire('Error', res.message || 'Error al cargar promociones', 'error');
        }
        setLoading(false);
    };

    useEffect(() => { cargarProductos(); }, [paginaActual, debouncedSearch]);

    // Funciones de paginación
    const next_page = () => { if (paginaActual < totalPaginas) setPaginaActual(p => p + 1); };
    const prev_page = () => { if (paginaActual > 1) setPaginaActual(p => p - 1); };

    // Apertura del modal
    const handleOpenModal = (prod: any) => {
        const formatForInput = (dateStr: string | null) => {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        };

        setFormData({
            descuento: prod.descuento || 0,
            fecha_inicio: formatForInput(prod.fecha_inicio),
            fecha_fin: formatForInput(prod.fecha_fin)
        });
        setPromoModal({ isOpen: true, id_producto: prod.id_producto, nombre: prod.nombre, precio_base: prod.precio_base });
    };

    // Guardar promoción
    const handleSavePromo = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const res = await apiService.guardarPromocion(
            promoModal.id_producto,
            formData.descuento,
            formData.fecha_inicio,
            formData.fecha_fin
        );
        setIsSaving(false);

        if (res.success) {
            Swal.fire('¡Éxito!', 'Promoción aplicada correctamente', 'success');
            setPromoModal({ ...promoModal, isOpen: false });
            cargarProductos();
        } else {
            Swal.fire('Error', res.message || 'No se pudo guardar la promoción', 'error');
        }
    };

    return (
        <DashboardLayout>
            <div className="p-6 md:p-10 max-w-1440px mx-auto font-sans relative">
                <div className="mb-8">
                    {/* ✨ Uso de isSuperAdmin para el título */}
                    <h1 className="text-3xl font-black text-slate-900">
                        {isSuperAdmin ? 'Promociones (Sede Central)' : 'Promociones (Sucursal Local)'}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {isSuperAdmin ? 'Configura descuentos globales para el catálogo.' : 'Configura descuentos locales exclusivos para tu sucursal.'}
                    </p>
                </div>

                {/* Búsqueda */}
                <div className="relative mb-6 max-w-md">
                    <span className="absolute left-4 top-3 text-gray-400 material-symbols-outlined">search</span>
                    <input 
                        type="text" placeholder="Buscar producto..."
                        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-amber-500 outline-none"
                    />
                </div>

                {/* Tabla de Promociones */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* ✨ Uso de 'loading' para mostrar el spinner */}
                    {loading ? (
                        <div className="p-20 flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-500 font-bold">Cargando catálogo...</p>
                        </div>
                    ) : productos.length === 0 ? (
                        <div className="p-20 text-center text-gray-500 font-bold bg-gray-50 border border-dashed border-gray-200 m-6 rounded-2xl">
                            No se encontraron productos en el catálogo.
                        </div>
                    ) : (
                        <div className="overflow-x-auto p-4">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-gray-200 text-xs uppercase tracking-wider text-slate-400">
                                        <th className="p-5 font-black">Producto</th>
                                        <th className="p-5 font-black">Precio Base</th>
                                        <th className="p-5 font-black">Descuento Activo</th>
                                        <th className="p-5 font-black">Vigencia</th>
                                        <th className="p-5 font-black text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {productos.map((prod) => {
                                        const hasPromo = prod.id_promocion !== null;
                                        const isActiva = hasPromo && new Date(prod.fecha_fin) > new Date();

                                        return (
                                            <tr key={prod.id_producto} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-5 text-sm font-bold text-slate-900">{prod.nombre}</td>
                                                <td className="p-5 text-sm font-medium text-slate-600">${Number(prod.precio_base).toFixed(2)}</td>
                                                <td className="p-5">
                                                    {hasPromo ? (
                                                        <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-black">-{prod.descuento}%</span>
                                                    ) : <span className="text-gray-400 text-sm">-</span>}
                                                </td>
                                                <td className="p-5 text-sm">
                                                    {isActiva ? <span className="text-emerald-600 font-bold">Hasta {new Date(prod.fecha_fin).toLocaleDateString()}</span> 
                                                    : hasPromo ? <span className="text-red-500 font-bold">Expirada</span> 
                                                    : <span className="text-gray-400">-</span>}
                                                </td>
                                                <td className="p-5 text-right">
                                                    <button onClick={() => handleOpenModal(prod)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Configurar Promoción">
                                                        <span className="material-symbols-outlined">sell</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>

                            {/* ✨ Uso de totalPaginas para la paginación */}
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

                {/* MODAL DE PROMOCIÓN */}
                {promoModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
                            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-3xl">sell</span>
                            </div>
                            <h3 className="text-xl font-black text-center text-slate-900 mb-2">Aplicar Descuento</h3>
                            <p className="text-gray-500 text-center text-sm mb-6 line-clamp-2">{promoModal.nombre}</p>

                            <form onSubmit={handleSavePromo} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Porcentaje de Descuento (%)</label>
                                    <input type="number" min="0" max="100" step="0.01" required value={formData.descuento} onChange={e => setFormData({...formData, descuento: parseFloat(e.target.value)})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-amber-500 text-xl font-black text-center text-amber-600" />
                                    {formData.descuento > 0 && (
                                        <p className="text-xs text-center text-emerald-600 font-bold mt-2">
                                            Precio final aproximado: ${(promoModal.precio_base - (promoModal.precio_base * (formData.descuento / 100))).toFixed(2)}
                                        </p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Inicio</label>
                                        <input type="datetime-local" required value={formData.fecha_inicio} onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-amber-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fin</label>
                                        <input type="datetime-local" required value={formData.fecha_fin} onChange={e => setFormData({...formData, fecha_fin: e.target.value})} className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-amber-500" />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setPromoModal({...promoModal, isOpen: false})} className="flex-1 bg-gray-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-gray-200">Cancelar</button>
                                    <button type="submit" disabled={isSaving} className="flex-1 bg-amber-500 text-white font-bold py-3 rounded-xl hover:bg-amber-600 shadow-lg active:scale-95 disabled:opacity-50">
                                        {isSaving ? 'Guardando...' : 'Guardar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AdminPromociones;
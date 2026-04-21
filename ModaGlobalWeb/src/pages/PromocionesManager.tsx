import React, { useState, useEffect } from 'react';
import { apiService, type PromocionAdmin } from '../services/ApiService';
import { useAuth } from '../context/AuthContext';

const PromocionesManager: React.FC = () => {
    const { isAdmin } = useAuth();
    const [productos, setProductos] = useState<PromocionAdmin[]>([]);
    const [tiendaActual, setTiendaActual] = useState<string>('');
    const [loading, setLoading] = useState(true);
    
    // Estado para el modal de edición
    const [editingProduct, setEditingProduct] = useState<PromocionAdmin | null>(null);
    const [formDescuento, setFormDescuento] = useState<number>(0);
    const [formInicio, setFormInicio] = useState<string>('');
    const [formFin, setFormFin] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const res = await apiService.getPromocionesAdmin();
        if (res.success && res.data) {
            setProductos(res.data);
            setTiendaActual(res.tienda_actual || 'Desconocida');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const openEditModal = (prod: PromocionAdmin) => {
        setEditingProduct(prod);
        setFormDescuento(prod.descuento || 0);
        // Formateamos las fechas para los inputs type="datetime-local"
        setFormInicio(prod.fecha_inicio ? new Date(prod.fecha_inicio).toISOString().slice(0,16) : '');
        setFormFin(prod.fecha_fin ? new Date(prod.fecha_fin).toISOString().slice(0,16) : '');
    };

    const handleSavePromocion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingProduct) return;
        
        setIsSaving(true);
        const res = await apiService.guardarPromocion(
            editingProduct.id_producto, 
            formDescuento, 
            new Date(formInicio).toISOString(), 
            new Date(formFin).toISOString()
        );

        if (res.success) {
            alert('¡Promoción actualizada en tu sucursal!');
            setEditingProduct(null);
            loadData(); // Recargamos para ver los cambios
        } else {
            alert('Error: ' + res.message);
        }
        setIsSaving(false);
    };

    if (!isAdmin) return <div className="p-10 text-center text-red-500 font-bold">Acceso Denegado</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-6 font-sans">
            <header className="max-w-7xl mx-auto mb-8">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900">Gestor de Promociones</h1>
                        <p className="text-gray-500 mt-2">
                            Estás editando las ofertas locales para la sucursal: 
                            <span className="ml-2 font-bold text-emerald-600 uppercase bg-emerald-100 px-3 py-1 rounded-full">
                                {tiendaActual}
                            </span>
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center text-gray-500">Cargando catálogo...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-900 text-white text-sm uppercase tracking-wider">
                                <tr>
                                    <th className="p-4">Producto</th>
                                    <th className="p-4">SKU</th>
                                    <th className="p-4">Precio Base</th>
                                    <th className="p-4">Descuento Local</th>
                                    <th className="p-4 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {productos.map(prod => {
                                    const tienePromo = prod.descuento !== null && prod.descuento > 0;
                                    return (
                                        <tr key={prod.id_producto} className="hover:bg-gray-50">
                                            <td className="p-4 font-bold text-slate-800">{prod.nombre}</td>
                                            <td className="p-4 text-gray-500 text-sm">{prod.sku}</td>
                                            <td className="p-4">${Number(prod.precio_base).toFixed(2)}</td>
                                            <td className="p-4">
                                                {tienePromo ? (
                                                    <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold text-sm">
                                                        -{prod.descuento}% OFF
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 italic text-sm">Sin oferta</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button 
                                                    onClick={() => openEditModal(prod)}
                                                    className="text-emerald-500 font-bold hover:bg-emerald-50 px-4 py-2 rounded-lg transition-colors text-sm"
                                                >
                                                    {tienePromo ? 'Editar Oferta' : 'Añadir Oferta'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* MODAL DE EDICIÓN FLOTANTE */}
            {editingProduct && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <h2 className="text-2xl font-black text-slate-900 mb-2">Configurar Oferta</h2>
                        <p className="text-gray-500 text-sm mb-6 truncate">{editingProduct.nombre}</p>

                        <form onSubmit={handleSavePromocion} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descuento (%)</label>
                                <input 
                                    type="number" min="0" max="100" required
                                    value={formDescuento} onChange={e => setFormDescuento(Number(e.target.value))}
                                    className="w-full border border-gray-300 p-3 rounded-xl focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Inicio</label>
                                    <input 
                                        type="datetime-local" required
                                        value={formInicio} onChange={e => setFormInicio(e.target.value)}
                                        className="w-full border border-gray-300 p-3 rounded-xl focus:border-emerald-500 outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fin</label>
                                    <input 
                                        type="datetime-local" required
                                        value={formFin} onChange={e => setFormFin(e.target.value)}
                                        className="w-full border border-gray-300 p-3 rounded-xl focus:border-emerald-500 outline-none text-sm"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button type="button" onClick={() => setEditingProduct(null)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200">
                                    Cancelar
                                </button>
                                <button type="submit" disabled={isSaving} className="flex-1 bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 shadow-md">
                                    {isSaving ? 'Guardando...' : 'Guardar Oferta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromocionesManager;
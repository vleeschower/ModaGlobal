import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/dashboardLayout';
import { apiService } from '../../services/ApiService';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';

interface SolicitudRow {
    id_solicitud: string;
    id_tienda: string;
    nombre_tienda: string;
    id_producto: string;
    cantidad: number;
    estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
    created_at: string;
}

const SolicitudesStock: React.FC = () => {
    const { isSuperAdmin } = useAuth();
    const [solicitudes, setSolicitudes] = useState<SolicitudRow[]>([]);
    const [loading, setLoading] = useState(true);
    
    // ✨ ESTADO PARA LOS TABS
    const [activeTab, setActiveTab] = useState<'PENDIENTE' | 'PROCESADAS'>('PENDIENTE');

    const loadData = async () => {
        setLoading(true);
        const res = await apiService.getSolicitudesStock();
        if (res.success && res.data) {
            setSolicitudes(res.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleResponder = (id_solicitud: string, accion: 'APROBAR' | 'RECHAZAR') => {
        Swal.fire({
            title: accion === 'APROBAR' ? '¿Aprobar solicitud?' : '¿Rechazar solicitud?',
            text: accion === 'APROBAR' 
                ? 'Esto descontará el stock de la Sede Central y lo asignará a la sucursal.'
                : 'La sucursal no recibirá este stock.',
            icon: accion === 'APROBAR' ? 'question' : 'warning',
            showCancelButton: true,
            confirmButtonColor: accion === 'APROBAR' ? '#10b981' : '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: accion === 'APROBAR' ? 'Sí, Aprobar e Ingresar' : 'Sí, Rechazar',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const res = await apiService.responderSolicitudStock(id_solicitud, accion);
                if (res.success) {
                    Swal.fire('¡Listo!', res.message, 'success');
                    loadData(); // Recargamos la tabla
                } else {
                    Swal.fire('Error', res.error || res.message, 'error');
                }
            }
        });
    };

    const getEstadoBadge = (estado: string) => {
        switch (estado) {
            case 'PENDIENTE':
                return <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold flex items-center gap-1 w-max"><span className="material-symbols-outlined text-[14px]">schedule</span> Pendiente</span>;
            case 'APROBADA':
                return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-1 w-max"><span className="material-symbols-outlined text-[14px]">check_circle</span> Aprobada</span>;
            case 'RECHAZADA':
                return <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold flex items-center gap-1 w-max"><span className="material-symbols-outlined text-[14px]">cancel</span> Rechazada</span>;
            default:
                return <span>{estado}</span>;
        }
    };

    // ✨ LÓGICA DE FILTRADO SEGÚN EL TAB ACTIVO
    const solicitudesFiltradas = solicitudes.filter(sol => {
        if (activeTab === 'PENDIENTE') {
            return sol.estado === 'PENDIENTE';
        } else {
            return sol.estado === 'APROBADA' || sol.estado === 'RECHAZADA';
        }
    });

    return (
        <DashboardLayout>
            <div className="p-6 md:p-10 max-w-1440px mx-auto font-sans">
                <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900">
                        {isSuperAdmin ? 'Centro de Reabastecimiento' : 'Mis Solicitudes de Stock'}
                    </h1>
                    <p className="text-gray-500 mt-2">
                        {isSuperAdmin 
                            ? 'Gestiona el flujo de inventario hacia las sucursales.' 
                            : 'Monitorea el estado de la mercancía solicitada a la matriz.'}
                    </p>
                </div>

                {/* ✨ MENÚ DE TABS */}
                <div className="flex border-b border-gray-200 mb-6">
                    <button
                        onClick={() => setActiveTab('PENDIENTE')}
                        className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab === 'PENDIENTE' 
                            ? 'border-emerald-500 text-emerald-600' 
                            : 'border-transparent text-gray-500 hover:text-slate-800'
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg">inbox</span>
                        Pendientes
                        {/* Pequeño contador visual */}
                        <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'PENDIENTE' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                            {solicitudes.filter(s => s.estado === 'PENDIENTE').length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('PROCESADAS')}
                        className={`py-3 px-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab === 'PROCESADAS' 
                            ? 'border-emerald-500 text-emerald-600' 
                            : 'border-transparent text-gray-500 hover:text-slate-800'
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg">history</span>
                        Historial Procesado
                    </button>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="p-20 flex flex-col items-center justify-center">
                            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-500 font-bold">Cargando solicitudes...</p>
                        </div>
                    ) : solicitudesFiltradas.length === 0 ? (
                        <div className="p-20 text-center text-gray-500 font-bold bg-gray-50 border border-dashed border-gray-200 m-6 rounded-2xl">
                            {activeTab === 'PENDIENTE' 
                                ? '🎉 Todo al día. No hay solicitudes de stock pendientes.'
                                : 'No hay historial de solicitudes procesadas.'}
                        </div>
                    ) : (
                        <div className="overflow-x-auto p-4">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-gray-200">
                                        <th className="p-5 font-black text-slate-400 uppercase tracking-wider text-xs rounded-tl-xl">Fecha</th>
                                        {isSuperAdmin && <th className="p-5 font-black text-slate-400 uppercase tracking-wider text-xs">Sucursal Destino</th>}
                                        <th className="p-5 font-black text-slate-400 uppercase tracking-wider text-xs">ID Producto</th>
                                        <th className="p-5 font-black text-slate-400 uppercase tracking-wider text-xs text-center">Cantidad</th>
                                        <th className="p-5 font-black text-slate-400 uppercase tracking-wider text-xs">Estado</th>
                                        {isSuperAdmin && activeTab === 'PENDIENTE' && <th className="p-5 font-black text-slate-400 uppercase tracking-wider text-xs text-right rounded-tr-xl">Acciones</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {solicitudesFiltradas.map((sol) => (
                                        <tr key={sol.id_solicitud} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-5 text-sm font-medium text-slate-500">
                                                {new Date(sol.created_at).toLocaleDateString()} <br/>
                                                <span className="text-xs text-gray-400">{new Date(sol.created_at).toLocaleTimeString()}</span>
                                            </td>
                                            
                                            {isSuperAdmin && (
                                                <td className="p-5">
                                                    <p className="font-bold text-slate-900">{sol.nombre_tienda}</p>
                                                    <p className="text-xs text-gray-400 font-mono">{sol.id_tienda}</p>
                                                </td>
                                            )}

                                            <td className="p-5 text-sm font-mono text-slate-600 bg-slate-50/50">
                                                {sol.id_producto}
                                            </td>
                                            
                                            <td className="p-5 text-center">
                                                <span className="font-black text-slate-900 text-lg">{sol.cantidad}</span>
                                                <span className="text-xs text-gray-500 ml-1">uds.</span>
                                            </td>

                                            <td className="p-5">
                                                {getEstadoBadge(sol.estado)}
                                            </td>

                                            {/* La columna de acciones solo existe si eres SuperAdmin y estás en el tab PENDIENTE */}
                                            {isSuperAdmin && activeTab === 'PENDIENTE' && (
                                                <td className="p-5 flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleResponder(sol.id_solicitud, 'APROBAR')}
                                                        className="p-1.5 text-gray-400 hover:text-emerald-500 transition-colors"
                                                        title="Aprobar Solicitud"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">check_circle</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleResponder(sol.id_solicitud, 'RECHAZAR')}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                                                        title="Rechazar Solicitud"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">cancel</span>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

export default SolicitudesStock;
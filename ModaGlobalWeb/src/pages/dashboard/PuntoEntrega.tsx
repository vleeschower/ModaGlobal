import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { apiService } from '../../services/ApiService';

const PuntoEntrega: React.FC = () => {
    const [codigo, setCodigo] = useState('');
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleBuscar = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await apiService.buscarTicketPorCodigo(codigo.trim());
        setLoading(false);

        if (res.success && res.data) {
            setTicket(res.data);
        } else {
            Swal.fire('No encontrado', res.error || res.message, 'error');
            setTicket(null);
        }
    };

    const handleEntregar = async () => {
        if (!ticket) return;

        const result = await Swal.fire({
            title: '¿Confirmar entrega?',
            text: "Asegúrate de haber revisado la identificación del cliente.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, entregar paquete'
        });

        if (result.isConfirmed) {
            setLoading(true);
            const res = await apiService.confirmarEntregaPedido(ticket.id_venta);
            setLoading(false);

            if (res.success) {
                Swal.fire('¡Entregado!', 'El pedido ha sido entregado exitosamente. El stock reservado se ha actualizado.', 'success');
                setTicket(res.data); // Actualizará la vista a ENTREGADA
                setCodigo('');
            } else {
                Swal.fire('Error', res.error || res.message, 'error');
            }
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto mt-10 bg-white rounded-3xl shadow-md border border-gray-100">
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500">qr_code_scanner</span>
                Punto de Entrega (Cajero)
            </h2>

            <form onSubmit={handleBuscar} className="flex gap-4 mb-8">
                <input
                    type="text"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                    placeholder="Escanear o teclear Código (Ej: REC-3A1A94)"
                    className="flex-1 p-4 border border-gray-300 rounded-xl text-lg font-mono font-bold tracking-widest uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                />
                <button 
                    type="submit" 
                    disabled={loading}
                    className="bg-slate-900 text-white px-8 rounded-xl font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50"
                >
                    Buscar
                </button>
            </form>

            {ticket && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Orden de Compra</p>
                            <p className="font-mono font-bold text-slate-800">{ticket.id_venta}</p>
                        </div>
                        <div className="text-right">
                            <span className={`px-3 py-1 rounded-md text-xs font-black uppercase ${
                                ticket.estado === 'ENTREGADA' ? 'bg-blue-100 text-blue-700' :
                                ticket.estado === 'PAGADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'
                            }`}>
                                {ticket.estado}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-4 mb-8">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Artículos a entregar:</p>
                        {ticket.detalles.map((item: any) => (
                            <div key={item.id_detalle} className="flex justify-between bg-white p-3 rounded-lg border border-gray-100">
                                <span className="font-medium text-sm text-slate-700">{item.nombre_producto_snapshot}</span>
                                <span className="font-bold text-slate-900 bg-gray-100 px-3 py-1 rounded-md text-xs">x{item.cantidad}</span>
                            </div>
                        ))}
                    </div>

                    {ticket.estado === 'PAGADO' && (
                        <button 
                            onClick={handleEntregar}
                            disabled={loading}
                            className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-600 transition-transform active:scale-95 text-lg"
                        >
                            {loading ? 'Procesando...' : 'Confirmar Entrega y Liberar Reserva'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default PuntoEntrega;
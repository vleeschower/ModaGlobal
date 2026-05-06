import React, { useState } from 'react';
import DashboardLayout from '../../components/dashboardLayout';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import { apiService } from '../../services/ApiService';
import { useNavigate } from 'react-router-dom'; // ✨ 1. IMPORTAMOS useNavigate

const EntregasDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate(); // ✨ 2. INICIALIZAMOS EL HOOK DE NAVEGACIÓN
  const [codigoRecoleccion, setCodigoRecoleccion] = useState('');
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 1. FUNCIÓN PARA BUSCAR EL TICKET POR CÓDIGO
  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!codigoRecoleccion.trim()) {
        Swal.fire({ icon: 'warning', title: 'Campo vacío', text: 'Ingresa el código de recolección.' });
        return;
    }

    setLoading(true);
    const res = await apiService.buscarTicketPorCodigo(codigoRecoleccion.trim().toUpperCase());
    setLoading(false);

    if (res.success && res.data) {
        setTicket(res.data);
    } else {
        Swal.fire({
            icon: 'error',
            title: 'No encontrado',
            text: res.error || res.message || 'Código incorrecto o pedido no encontrado.',
            confirmButtonColor: '#ef4444'
        });
        setTicket(null);
    }
  };

  // 2. FUNCIÓN PARA VALIDAR LA ENTREGA EN FÍSICO Y DISPARAR EVENTOS
  const handleEntregar = async () => {
    if (!ticket) return;

    const result = await Swal.fire({
        title: '¿Validar entrega en físico?',
        text: "Verifica que los productos coincidan y que hayas validado la identidad del comprador.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, confirmar entrega',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        setLoading(true);
        try {
            // Llama a VentasService (cambia el estado y lanza el evento al Service Bus)
            const res = await apiService.confirmarEntregaPedido(ticket.id_venta);
            
            if (res.success) {
                // ✨ 3. AGREGAMOS EL .then() PARA REDIRIGIR AL CERRAR LA ALERTA
                Swal.fire({
                    icon: 'success',
                    title: 'Venta completada',
                    text: 'El paquete se entregó en físico. El stock reservado ha disminuido en el inventario.',
                    confirmButtonColor: '#10b981'
                }).then(() => {
                    navigate('/dashboard'); // Cambia esto si la ruta principal de tu dashboard es diferente
                });

            } else {
                Swal.fire('Error', res.error || res.message, 'error');
            }
        } catch (error: any) {
            Swal.fire('Error crítico', 'La ruta de ventas no está respondiendo. Verifica tu conexión.', 'error');
        } finally {
            setLoading(false);
        }
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8">
        
        {/* Cabecera */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-emerald-600 text-3xl">storefront</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Punto de Entrega Físico</h1>
            <p className="text-gray-500 text-sm mt-1">
              Verifica el código de recolección del cliente para hacer la entrega en la sucursal.
            </p>
          </div>
        </div>

        {/* Buscador */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10">
          <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-gray-400">qr_code_scanner</span>
              </div>
              <input
                type="text"
                value={codigoRecoleccion}
                onChange={(e) => setCodigoRecoleccion(e.target.value.toUpperCase())}
                placeholder="Escanear Código (Ej. REC-A1B2C3)"
                className="w-full pl-10 pr-4 py-4 border border-gray-300 rounded-xl outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all font-mono text-lg tracking-widest uppercase text-gray-800"
                required
                disabled={loading}
              />
            </div>
            <button 
                type="submit" 
                disabled={loading || !codigoRecoleccion}
                className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-emerald-500 transition-colors disabled:opacity-50 sm:w-auto w-full flex justify-center items-center gap-2"
            >
                {loading ? <span className="material-symbols-outlined animate-spin">sync</span> : 'Buscar Pedido'}
            </button>
          </form>
        </div>

        {/* Resumen del Ticket y Botón de Entrega */}
        {ticket && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 animate-fade-in">
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                    
                    <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Orden de Compra</p>
                            <p className="font-mono font-bold text-slate-800">{ticket.id_venta}</p>
                        </div>
                        <div className="text-right">
                            <span className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide ${
                                ticket.estado === 'ENTREGADA' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                (ticket.estado === 'PAGADO' || ticket.estado === 'COMPLETADA') ? 'bg-blue-100 text-blue-700 border border-blue-200' : 
                                'bg-gray-200 text-gray-700'
                            }`}>
                                {ticket.estado}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-3 mb-8">
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Artículos a entregar:</p>
                        {ticket.detalles.map((item: any) => (
                            <div key={item.id_detalle} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <span className="font-medium text-sm text-slate-700">{item.nombre_producto_snapshot}</span>
                                <span className="font-black text-slate-900 bg-gray-100 px-3 py-1 rounded-md text-sm border border-gray-200">
                                    x{item.cantidad}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* BOTÓN PARA VALIDAR LA ENTREGA */}
                    {(ticket.estado === 'COMPLETADA' || ticket.estado === 'PAGADO') && (
                        <button 
                            onClick={handleEntregar}
                            disabled={loading}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
                                ${loading 
                                  ? 'bg-gray-400 cursor-not-allowed shadow-none' 
                                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 hover:shadow-emerald-600/50 active:scale-95'
                                }`}
                        >
                            {loading ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin">sync</span>
                                    Procesando transacción...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">how_to_reg</span>
                                    Validar entrega en físico
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default EntregasDashboard;
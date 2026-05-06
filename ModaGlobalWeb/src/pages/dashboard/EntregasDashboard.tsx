import React, { useState } from 'react';
import DashboardLayout from '../../components/dashboardLayout';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';

const EntregasDashboard: React.FC = () => {
  const { user } = useAuth();
  const [idVenta, setIdVenta] = useState('');
  const [codigoRecoleccion, setCodigoRecoleccion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEntregar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!idVenta.trim() || !codigoRecoleccion.trim()) {
      Swal.fire({ icon: 'warning', title: 'Campos incompletos', text: 'Ingresa la orden y el código.' });
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('mg_token') || '';
      
      // ✨ Usamos la variable global de tu .env o apuntamos directo a tu API
      const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000/api';

      const response = await fetch(`${API_URL}/venta/${idVenta}/estado`, {
        method: 'PATCH', // Si tu backend sigue rechazando PATCH, avísame y lo cambiamos a PUT o POST en tu Node
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          estado_nuevo: 'ENTREGADA',
          codigo_recoleccion: codigoRecoleccion,
          modificado_por: user?.id || 'Cajero'
        })
      });

      // 🔥 TRUCO SENIOR: Leemos la respuesta como TEXTO primero, para ver si es HTML o JSON
      const textResponse = await response.text();

      if (!response.ok) {
        // Si el servidor nos mandó un HTML de error (el <!DOCTYPE)
        if (textResponse.startsWith('<')) {
          console.error("❌ ERROR DEL SERVIDOR (No es JSON):", textResponse);
          throw new Error('El Gateway bloqueó la petición o la ruta no existe. Revisa la consola.');
        }

        // Si sí es JSON, lo parseamos y mostramos tu error exacto de la base de datos
        const errorData = JSON.parse(textResponse);
        Swal.fire({
          icon: 'error',
          title: 'Error en la entrega',
          text: errorData.error || 'Código incorrecto o pedido no encontrado.',
          confirmButtonColor: '#ef4444'
        });
        setLoading(false);
        return;
      }

      // Si todo salió bien:
      Swal.fire({
        icon: 'success',
        title: '¡Pedido Entregado!',
        text: 'El paquete ha sido entregado exitosamente.',
        confirmButtonColor: '#10b981'
      });
      
      setIdVenta('');
      setCodigoRecoleccion('');

    } catch (error: any) {
      console.error('Error crítico:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error de Ruta / Servidor',
        text: error.message || 'La ruta de ventas no está respondiendo. Verifica tu API Gateway.',
        confirmButtonColor: '#ef4444'
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8">
        
        {/* Cabecera */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-blue-600 text-3xl">local_shipping</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Entregar Pedidos Web</h1>
            <p className="text-gray-500 text-sm mt-1">
              Verifica el código de recolección del cliente para hacer la entrega en sucursal.
            </p>
          </div>
        </div>

        {/* Formulario Principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10">
          <form onSubmit={handleEntregar} className="space-y-6">
            
            {/* Input Número de Orden */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Número de Orden (ID Venta)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400">receipt_long</span>
                </div>
                <input
                  type="text"
                  value={idVenta}
                  onChange={(e) => setIdVenta(e.target.value)}
                  placeholder="Ej. VTA-12345678"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-700 uppercase"
                  required
                />
              </div>
            </div>

            {/* Input Código de Recolección */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Código de Recolección
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400">qr_code_scanner</span>
                </div>
                <input
                  type="text"
                  value={codigoRecoleccion}
                  onChange={(e) => setCodigoRecoleccion(e.target.value)}
                  placeholder="Ej. REC-A1B2C3"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-mono text-lg tracking-widest uppercase text-gray-800"
                  required
                />
              </div>
            </div>

            {/* Botón de Submit */}
            <button
              type="submit"
              disabled={loading || !idVenta || !codigoRecoleccion}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
                ${loading || !idVenta || !codigoRecoleccion 
                  ? 'bg-gray-400 cursor-not-allowed shadow-none' 
                  : 'bg-[#002727] hover:bg-[#004040] shadow-[#002727]/30 hover:shadow-[#002727]/50'
                }`}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  Verificando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">check_circle</span>
                  Validar y Entregar Paquete
                </>
              )}
            </button>
            
          </form>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default EntregasDashboard;
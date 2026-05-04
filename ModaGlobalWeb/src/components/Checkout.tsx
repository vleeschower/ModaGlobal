import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { useCart } from '../context/CartContext';
import { apiService } from '../services/ApiService'; 

declare const OpenPay: any;

const Checkout: React.FC = () => {
  const { totalPrice, cart, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const deviceSessionId = useRef<string>('');

  const [tarjeta, setTarjeta] = useState({
    nombre: '',
    numero: '',
    mes: '',
    anio: '',
    cvv: ''
  });

  useEffect(() => {
    OpenPay.setId(import.meta.env.VITE_OPENPAY_ID);
    OpenPay.setApiKey(import.meta.env.VITE_OPENPAY_PUBLIC_KEY);
    OpenPay.setSandboxMode(true); 
    deviceSessionId.current = OpenPay.deviceData.setup();
  }, []);

  const handlePagar = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const requestData = {
      "holder_name": tarjeta.nombre,
      "card_number": tarjeta.numero.replace(/\s/g, ''), 
      "expiration_month": tarjeta.mes,
      "expiration_year": tarjeta.anio, 
      "cvv2": tarjeta.cvv
    };

    OpenPay.token.create(
      requestData,
      (response: any) => {
        const tokenId = response.data.id;
        
        // 🛒 Mandamos el ID de la sucursal (Temporalmente quemado para la prueba, luego lo harás dinámico)
        apiService.procesarPago(tokenId, deviceSessionId.current, totalPrice)
          .then(async (res) => {
            if (res.success) {
              Swal.fire({
                icon: 'success',
                title: '¡Pago Exitoso!',
                text: 'Tu pedido ha sido confirmado y guardado.',
              }).then(async () => {
                 await clearCart(); 
                 window.location.href = '/catalogo'; 
              });
            } else {
              Swal.fire('Error en el servidor', res.message, 'error');
              setLoading(false);
            }
          })
          .catch((error) => {
             console.error("Error al contactar al backend:", error);
             Swal.fire('Error', 'No se pudo conectar con el backend de ventas', 'error');
             setLoading(false);
          });
      },
      (error: any) => {
        console.error("❌ Error de Openpay:", error);
        Swal.fire('Error en la tarjeta', error.message || 'Revisa tus datos e intenta de nuevo.', 'error');
        setLoading(false);
      }
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTarjeta({ ...tarjeta, [e.target.name]: e.target.value });
  };

  // =========================================================================
  // 🎨 AQUÍ EMPIEZA LA NUEVA UI CLÁSICA TIPO OPENPAY
  // =========================================================================
  return (
    <div className="max-w-4xl mx-auto mt-10 bg-white shadow-md border border-gray-200">
      
      {/* HEADER GRIS */}
      <div className="bg-[#f2f2f2] px-8 py-5 border-b border-gray-200">
        <h2 className="text-2xl font-light text-gray-800">Tarjeta de crédito o débito</h2>
      </div>

      <div className="p-8">
        {/* SECCIÓN DE LOGOS DE BANCOS */}
        <div className="flex flex-col md:flex-row gap-8 mb-8 pb-6 border-b border-gray-200">
          <div className="flex-1">
            <p className="text-sm text-gray-600 font-semibold mb-3">Tarjetas de crédito</p>
            {/* Aquí puedes cambiar estos span por etiquetas <img> con los logos reales */}
            <div className="flex gap-2 items-center text-xs font-bold text-blue-900">
              <span className="px-2 py-1 border rounded">VISA</span>
              <span className="px-2 py-1 border rounded text-red-600">MasterCard</span>
              <span className="px-2 py-1 border rounded text-blue-500">AMEX</span>
            </div>
          </div>
          <div className="hidden md:block w-px bg-gray-300"></div>
          <div className="flex-[2]">
            <p className="text-sm text-gray-600 font-semibold mb-3">Tarjetas de débito</p>
            <div className="flex flex-wrap gap-3 items-center text-xs font-bold text-gray-700">
              <span className="px-2 py-1 border rounded text-blue-800">BBVA</span>
              <span className="px-2 py-1 border rounded text-red-600">Santander</span>
              <span className="px-2 py-1 border rounded">HSBC</span>
              <span className="px-2 py-1 border rounded text-red-500">Scotiabank</span>
              <span className="px-2 py-1 border rounded text-green-700">Inbursa</span>
            </div>
          </div>
        </div>

        {/* FORMULARIO A DOS COLUMNAS */}
        <form onSubmit={handlePagar} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Nombre */}
            <div>
              <label className="block text-lg text-gray-700 font-light mb-2">Nombre del titular</label>
              <input 
                type="text" name="nombre" value={tarjeta.nombre} onChange={handleChange} required
                className="w-full p-2 border border-gray-300 rounded-sm outline-none focus:border-blue-500 text-gray-600 placeholder-gray-400 italic" 
                placeholder="Como aparece en la tarjeta"
              />
            </div>

            {/* Número */}
            <div>
              <label className="block text-lg text-gray-700 font-light mb-2">Número de tarjeta</label>
              <input 
                type="text" name="numero" value={tarjeta.numero} onChange={handleChange} required maxLength={19}
                className="w-full p-2 border border-gray-300 rounded-sm outline-none focus:border-blue-500 text-gray-700 tracking-wider" 
                placeholder="•••• •••• •••• ••••" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Fecha */}
            <div>
              <label className="block text-lg text-gray-700 font-light mb-2">Fecha de expiración</label>
              <div className="flex gap-4">
                <input 
                  type="text" name="mes" value={tarjeta.mes} onChange={handleChange} required maxLength={2}
                  className="w-full p-2 border border-gray-300 rounded-sm outline-none focus:border-blue-500 text-gray-600 placeholder-gray-400 italic" 
                  placeholder="Mes"
                />
                <input 
                  type="text" name="anio" value={tarjeta.anio} onChange={handleChange} required maxLength={2}
                  className="w-full p-2 border border-gray-300 rounded-sm outline-none focus:border-blue-500 text-gray-600 placeholder-gray-400 italic" 
                  placeholder="Año"
                />
              </div>
            </div>

            {/* CVV */}
            <div>
              <label className="block text-lg text-gray-700 font-light mb-2">Código de seguridad</label>
              <div className="flex items-center gap-4">
                <input 
                  type="text" name="cvv" value={tarjeta.cvv} onChange={handleChange} required maxLength={4}
                  className="w-32 p-2 border border-gray-300 rounded-sm outline-none focus:border-blue-500 text-gray-600 placeholder-gray-400 italic" 
                  placeholder="3 dígitos"
                />
                {/* Iconos simulados de tarjeta para el CVV */}
                <div className="hidden sm:flex gap-2 opacity-50">
                  <div className="w-12 h-8 bg-gray-300 rounded border border-gray-400 flex items-center justify-end px-1">
                     <span className="w-4 h-1 bg-gray-500 rounded-full"></span>
                  </div>
                  <div className="w-12 h-8 bg-gray-300 rounded border border-gray-400 flex items-start justify-end p-1">
                     <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER OPENPAY Y BOTÓN */}
          <div className="flex flex-col md:flex-row justify-between items-center mt-10 pt-6 border-t border-gray-200">
            
            {/* Logos de seguridad */}
            <div className="flex items-center gap-6 mb-4 md:mb-0">
              <div className="text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">Transacciones realizadas vía:</p>
                <p className="text-xl font-bold text-[#00a1e0]">Openpay</p>
              </div>
              <div className="w-px h-8 bg-gray-300"></div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="material-symbols-outlined text-green-600 text-2xl">verified_user</span>
                <p className="leading-tight text-xs">Tus pagos se realizan de forma segura<br/>con encriptación de 256 bits</p>
              </div>
            </div>

            {/* Botón Pagar */}
            <button 
              type="submit" 
              disabled={loading || cart.length === 0}
              className={`px-10 py-2 text-lg rounded shadow-sm transition-all
                ${loading || cart.length === 0 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-[#b32121] hover:bg-[#8f1919] text-white font-semibold'}`}
            >
              {loading ? 'Procesando...' : `Pagar $${totalPrice.toFixed(2)}`}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Checkout;
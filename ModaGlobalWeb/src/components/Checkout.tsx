import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { useCart } from '../context/CartContext';
// 👇 Importamos tu apiService para poder mandar la petición al backend
import { apiService } from '../services/ApiService'; 

// Le decimos a TypeScript que OpenPay existe globalmente gracias al index.html
declare const OpenPay: any;

const Checkout: React.FC = () => {
  // 👇 Traemos también clearCart para vaciarlo al terminar la compra
  const { totalPrice, cart, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  
  // Guardaremos el ID de sesión antifraude aquí
  const deviceSessionId = useRef<string>('');

  // Estados del formulario de la tarjeta
  const [tarjeta, setTarjeta] = useState({
    nombre: '',
    numero: '',
    mes: '',
    anio: '',
    cvv: ''
  });

  // Inicializamos Openpay al cargar el componente
  useEffect(() => {
    // Tomamos las llaves de Sandbox de las variables de entorno
    OpenPay.setId(import.meta.env.VITE_OPENPAY_ID);
    OpenPay.setApiKey(import.meta.env.VITE_OPENPAY_PUBLIC_KEY);
    OpenPay.setSandboxMode(true); // Modo Pruebas Activo

    // Generamos un ID de dispositivo para el sistema antifraude
    deviceSessionId.current = OpenPay.deviceData.setup();
  }, []);

  const handlePagar = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Formateamos los datos exactamente como Openpay los exige
    const requestData = {
      "holder_name": tarjeta.nombre,
      "card_number": tarjeta.numero.replace(/\s/g, ''), // Limpiamos espacios en blanco
      "expiration_month": tarjeta.mes,
      "expiration_year": tarjeta.anio, // Solo 2 dígitos (ej. 26)
      "cvv2": tarjeta.cvv
    };

    // Lanzamos la petición a los servidores de Openpay
    OpenPay.token.create(
      requestData,
      (response: any) => {
        // 1. ¡ÉXITO! Openpay nos devuelve el Token seguro
        const tokenId = response.data.id;
        
        console.log("🔥 TOKEN SEGURO DE OPENPAY:", tokenId);
        
        // 2. 🚀 AHORA SÍ: SE LO MANDAMOS A NUESTRO BACKEND PARA QUE COBRE Y GUARDE EN BD
        apiService.procesarPago(tokenId, deviceSessionId.current, totalPrice)
          .then(res => {
            if (res.success) {
              // 3. EL BACKEND RESPONDIÓ QUE YA GUARDÓ EN LA BD
              Swal.fire({
                icon: 'success',
                title: '¡Pago Exitoso!',
                text: 'Tu pedido ha sido confirmado y guardado.',
              }).then(() => {
                 clearCart(); // Limpiamos el carrito del frontend
                 // Opcional: Redirigimos al catálogo o a una pantalla de "Mis Pedidos"
                 window.location.href = '/catalogo'; 
              });
            } else {
              // El backend rebotó el pago (ej. error en Prisma)
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
        // ALGO SALIÓ MAL CON LA TARJETA EN OPENPAY (Fondos insuficientes, tarjeta inválida, etc.)
        console.error("❌ Error de Openpay:", error);
        Swal.fire('Error en la tarjeta', error.message || 'Revisa tus datos e intenta de nuevo.', 'error');
        setLoading(false);
      }
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTarjeta({ ...tarjeta, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mt-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-slate-900">Pago Seguro</h2>
        <span className="material-symbols-outlined text-green-500">lock</span>
      </div>
      
      <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
        <p className="text-sm text-gray-500">Total a pagar</p>
        <p className="text-3xl font-black text-slate-900">${totalPrice.toFixed(2)}</p>
      </div>
      
      <form onSubmit={handlePagar} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nombre en la tarjeta</label>
          <input 
            type="text" name="nombre" value={tarjeta.nombre} onChange={handleChange} required
            className="w-full mt-1 p-3 bg-white border border-gray-200 rounded-xl focus:border-primary outline-none focus:ring-2 focus:ring-primary/20" 
            placeholder="Ej. Rogelio Pérez"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Número de Tarjeta</label>
          <input 
            type="text" name="numero" value={tarjeta.numero} onChange={handleChange} required maxLength={19}
            className="w-full mt-1 p-3 bg-white border border-gray-200 rounded-xl focus:border-primary outline-none focus:ring-2 focus:ring-primary/20" 
            placeholder="4111 1111 1111 1111" // <--- ¡Tarjeta mágica de prueba!
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mes</label>
            <input 
              type="text" name="mes" value={tarjeta.mes} onChange={handleChange} required maxLength={2}
              className="w-full mt-1 p-3 bg-white border border-gray-200 rounded-xl text-center focus:border-primary outline-none focus:ring-2 focus:ring-primary/20" 
              placeholder="12"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Año</label>
            <input 
              type="text" name="anio" value={tarjeta.anio} onChange={handleChange} required maxLength={2}
              className="w-full mt-1 p-3 bg-white border border-gray-200 rounded-xl text-center focus:border-primary outline-none focus:ring-2 focus:ring-primary/20" 
              placeholder="28"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">CVV</label>
            <input 
              type="text" name="cvv" value={tarjeta.cvv} onChange={handleChange} required maxLength={4}
              className="w-full mt-1 p-3 bg-white border border-gray-200 rounded-xl text-center focus:border-primary outline-none focus:ring-2 focus:ring-primary/20" 
              placeholder="123"
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading || cart.length === 0}
          className={`w-full py-4 rounded-xl font-bold transition-all shadow-lg mt-6 flex items-center justify-center gap-2
            ${loading || cart.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-primary-esmeralda active:scale-95'}`}
        >
          {loading ? (
            'Validando pago en servidor...'
          ) : (
            <>Pagar ${totalPrice.toFixed(2)}</>
          )}
        </button>
        <p className="text-center text-xs text-gray-400 mt-4">Transacción encriptada por Openpay México</p>
      </form>
    </div>
  );
};

export default Checkout;
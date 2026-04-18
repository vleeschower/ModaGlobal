import React, { useState } from 'react';
import { apiService, type StockItem } from '../services/ApiService';
import { useAuth } from '../context/AuthContext'; // Para proteger la vista

const InventoryManager: React.FC = () => {
  const { isAdmin } = useAuth(); // Asumiendo que Admin/SuperAdmin pueden ver esto
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [productoId, setProductoId] = useState<string>(''); 
  const [busquedaExitosa, setBusquedaExitosa] = useState<boolean>(false);

  // Estados del Formulario de Ingreso
  const [cantidad, setCantidad] = useState<number | ''>('');
  const [tipoMovimiento, setTipoMovimiento] = useState<string>('INGRESO');
  const [referencia, setReferencia] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadStockData = async (id: string) => {
    if (!id) return;
    setLoading(true); setError(null); setBusquedaExitosa(false); // Reseteamos
    
    const result = await apiService.getProductoStock(id);
    
    if (result.success && result.data) {
        setStockData(result.data);
        setBusquedaExitosa(true); // ✨ Búsqueda completada sin errores de red/404
    } else { 
        setError(result.message || 'Error al cargar los datos.'); 
        setStockData([]); 
    }
    setLoading(false);
  };

  const handleAjusteStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoId || !cantidad) return alert("Faltan datos obligatorios");

    setIsSubmitting(true);
    const res = await apiService.registrarMovimientoStock(productoId, Number(cantidad), tipoMovimiento, referencia);
    
    if (res.success) {
        alert("¡Stock actualizado con éxito!");
        setCantidad(''); setReferencia('');
        loadStockData(productoId); // Recargamos la tabla en vivo
    } else {
        alert("Error: " + res.message);
    }
    setIsSubmitting(false);
  };

  if (!isAdmin) return <div className="p-20 text-center text-red-500 font-bold">Acceso Denegado. Solo personal de Almacén.</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-6">
      <header className="mb-10 pb-4 border-b border-gray-200">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Recepción de Almacén</h1>
        <p className="mt-2 text-lg text-gray-600">Gestión operativa de inventarios</p>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* PANEL IZQUIERDO: BÚSQUEDA Y FORMULARIO */}
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-lg mb-4">1. Buscar Producto</h3>
                <div className="flex gap-2">
                    <input 
                        type="text" value={productoId} onChange={(e) => setProductoId(e.target.value)} 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-emerald-500"
                        placeholder="Ej: prod-050c4c2c"
                    />
                    <button onClick={() => loadStockData(productoId)} className="bg-slate-900 text-white px-4 rounded-lg font-bold hover:bg-emerald-500">Buscar</button>
                </div>
            </div>

            {busquedaExitosa && (
              <form onSubmit={handleAjusteStock} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h3 className="font-bold text-lg border-b pb-2">2. Registrar Movimiento</h3>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Tipo</label>
                        <select value={tipoMovimiento} onChange={e => setTipoMovimiento(e.target.value)} className="w-full p-2 border rounded-lg mt-1">
                            <option value="INGRESO">Ingreso (Compra/Proveedor)</option>
                            <option value="MERMA">Merma (Daño/Pérdida)</option>
                            <option value="TRASLADO">Traslado</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Cantidad (+/-)</label>
                        <input 
                            type="number" 
                            value={cantidad} 
                            onChange={e => setCantidad(e.target.value === '' ? '' : Number(e.target.value))} 
                            className="w-full p-2 border rounded-lg mt-1" 
                            placeholder="Ej: 50 o -5" 
                            required 
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Referencia (Factura/Ticket)</label>
                        <input type="text" value={referencia} onChange={e => setReferencia(e.target.value)} className="w-full p-2 border rounded-lg mt-1" placeholder="OPCIONAL" />
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 disabled:opacity-50">
                        {isSubmitting ? 'Procesando...' : 'Aplicar Ajuste'}
                    </button>
                </form>
            )}
        </div>

        {/* PANEL DERECHO: VISTA DE STOCK */}
        <div className="lg:col-span-2">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-full">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Estado Actual</h2>
                {loading && <p className="text-gray-500">Cargando...</p>}
                {error && <p className="text-red-500">{error}</p>}
                
                {!loading && stockData.length > 0 && (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-sm">
                            <tr><th className="p-4 rounded-l-lg">Tienda</th><th className="p-4">Disponible</th><th className="p-4 rounded-r-lg">Reservado</th></tr>
                        </thead>
                        <tbody>
                            {stockData.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-50">
                                    <td className="p-4 font-medium">{item.id_tienda}</td>
                                    <td className={`p-4 font-black text-2xl ${item.stock_disponible > 0 ? 'text-emerald-500' : 'text-red-500'}`}>{item.stock_disponible}</td>
                                    <td className="p-4 text-gray-400">{item.stock_reservado}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {!loading && !error && stockData.length === 0 && productoId && (
                    <p className="text-gray-500 text-center py-10">Busca un ID de producto válido para gestionar su stock.</p>
                )}
            </div>
        </div>
      </main>
    </div>
  );
};

export default InventoryManager;
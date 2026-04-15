import { useState, useEffect } from 'react';
import { apiService, type StockItem } from '../services/ApiService';

function App() {
  const [stockData, setStockData] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [productoId, setProductoId] = useState<string>('prod-001'); // Producto por defecto

  // Función para cargar los datos
  const loadStockData = async (id: string) => {
    setLoading(true);
    setError(null);
    const result = await apiService.getProductoStock(id);
    
    if (result.success && result.data) {
      setStockData(result.data);
    } else {
      setError(result.message || 'Error al cargar los datos.');
      setStockData([]); // Limpiar datos anteriores
    }
    setLoading(false);
  };

  // Cargar datos al montar el componente y cuando cambie el productoId
  useEffect(() => {
    loadStockData(productoId);
  }, [productoId]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-6">
      <header className="mb-10 pb-4 border-b border-gray-200">
        <h1 className="text-4xl font-extrabold text-blue-900 tracking-tight">ModaGlobal Dashboard</h1>
        <p className="mt-2 text-lg text-gray-600">Panel Omnicanal de Inventarios en Tiempo Real</p>
      </header>

      <main className="max-w-7xl mx-auto">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-8 gap-4">
            <h2 className="text-2xl font-bold text-gray-800">Estado del Inventario</h2>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={productoId} 
                onChange={(e) => setProductoId(e.target.value)} 
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                placeholder="ID del Producto"
              />
              <button 
                onClick={() => loadStockData(productoId)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Buscar
              </button>
            </div>
          </div>

          {loading && <p className="text-center text-gray-500 py-10">Cargando datos...</p>}
          {error && <p className="text-center text-red-500 bg-red-50 p-4 rounded-lg py-10">Error: {error}</p>}

          {!loading && !error && stockData.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="border-b-2 border-gray-200 bg-gray-100">
                  <tr>
                    <th className="p-4 font-semibold text-gray-700">Ubicación (Tienda/Almacén)</th>
                    <th className="p-4 font-semibold text-gray-700">Stock Disponible</th>
                    <th className="p-4 font-semibold text-gray-700">Stock Reservado</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="p-4 font-medium text-gray-800">{item.id_tienda}</td>
                      <td className={`p-4 font-bold text-xl ${item.stock_disponible > 5 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.stock_disponible}
                      </td>
                      <td className="p-4 text-gray-600 text-lg">{item.stock_reservado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && stockData.length === 0 && (
            <p className="text-center text-gray-500 py-10">No hay datos de inventario para este producto.</p>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
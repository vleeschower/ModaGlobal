// src/services/api.service.ts

// Usaremos variables de entorno de Vite para la URL
const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000';

// Interfaz para el tipo de datos que devuelve tu API
export interface StockItem {
  id_producto: string;
  id_tienda: string;
  stock_disponible: number;
  stock_reservado: number;
}

export interface ApiResponse {
  success: boolean;
  data?: StockItem[];
  message?: string;
}

export const apiService = {
  // Función para consultar el stock de un producto
  getProductoStock: async (productoId: string): Promise<ApiResponse> => {
    try {
      // Hacemos la petición al API GATEWAY (Puerto 3000)
      const response = await fetch(`${API_BASE_URL}/api/inventario/stock/${productoId}`);
      
      if (!response.ok) {
        throw new Error(`Error en la petición: ${response.status} ${response.statusText}`);
      }
      
      const data: ApiResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error en el apiService:', error);
      return { success: false, message: 'No se pudo conectar con el servidor.' };
    }
  }
};
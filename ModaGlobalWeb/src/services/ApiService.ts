// src/services/api.service.ts
import { type Producto } from '../types/Producto'; 

// 1. Cargamos las variables de entorno de Vite
const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000';
const TEMP_TOKEN = import.meta.env.VITE_TEMP_AUTH_TOKEN; // Tu token temporal

// 2. Interfaces de Datos
export interface StockItem {
  id_producto: string;
  id_tienda: string;
  stock_disponible: number;
  stock_reservado: number;
}

export interface PromocionAdmin {
    id_producto: string;
    nombre: string;
    sku: string;
    precio_base: number;
    id_promocion: string | null;
    descuento: number | null;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    id_tienda: string | null;
}

export interface PaginatedMeta {
  pagina_actual: number;
  productos_por_pagina: number;
  total_productos: number;
  total_paginas: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: PaginatedMeta;
  message?: string;
  error?: string;
}

// 3. Función Helper para inyectar el Token en las peticiones
const getAuthHeaders = (): HeadersInit => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Si pusiste un token en tu .env, lo inyecta como Bearer Token
  if (TEMP_TOKEN) {
    headers['Authorization'] = `Bearer ${TEMP_TOKEN}`;
  }

  return headers;
};

// 4. Objeto de Servicios
export const apiService = {
  
  // -- SERVICIO DE INVENTARIO --
  getProductoStock: async (productoId: string): Promise<ApiResponse<StockItem[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventario/stock/${productoId}`, {
        method: 'GET',
        headers: getAuthHeaders(), // Agregamos el header con el token
      });
      
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error en getProductoStock:', error);
      return { success: false, message: 'No se pudo obtener el stock.' };
    }
  },

  // ✨ NUEVO: Registrar un ajuste de stock manual o entrada de mercancía
  registrarMovimientoStock: async (id_producto: string, cantidad: number, tipo_movimiento: string, id_referencia: string): Promise<ApiResponse<any>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventario/movimientos`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id_producto, cantidad, tipo_movimiento, id_referencia })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Error: ${response.status}`);
      return data;
    } catch (error: any) {
      console.error('Error al registrar movimiento:', error);
      return { success: false, message: error.message || 'Error de red al actualizar inventario.' };
    }
  },

  // -- SERVICIO DE PRODUCTOS --
  getProductos: async (page: number = 1, limit: number = 12): Promise<ApiResponse<Producto[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/productos?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: getAuthHeaders(), // Agregamos el header con el token
      });
      console.log('Respuesta de getProductos:', response); // Log para depuración
      
      if (response.status === 401 || response.status === 403) {
        throw new Error('No autorizado. Tu token en el .env podría estar expirado o ser inválido.');
      }
      
      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
      
      return await response.json();
    } catch (error: any) {
      console.error('Error en getProductos:', error);
      return { success: false, message: error.message || 'No se pudo cargar el catálogo.' };
    }
  },

  getProductoById: async (id: string): Promise<ApiResponse<Producto>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/productos/${id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error: any) {
      console.error('Error en getProductoById:', error);
      return { success: false, message: 'No se pudo obtener el detalle del producto.' };
    }
  },

  getResena: async (id: string): Promise<ApiResponse<Producto>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/productos/${id}/resenas`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error: any) {
      console.error('Error en getresena', error);
      return { success: false, message: 'No se pudieron obtener las reseñas.' };
    }
  },

  // ✨ NUEVO: Flujo para crear reseñas
  crearResena: async (id_producto: string, calificacion: number, comentario: string): Promise<ApiResponse<any>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/productos/resenas`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id_producto, calificacion, comentario })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Error del servidor: ${response.status}`);
      }
      
      return data;
    } catch (error: any) {
      console.error('Error en crearResena:', error);
      return { success: false, message: error.message || 'No se pudo publicar la reseña.' };
    }
  },

  // ✨ NUEVO: Eliminar reseña (Soft Delete)
  eliminarResena: async (idResena: string): Promise<ApiResponse<any>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/productos/resenas/${idResena}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error: any) {
      console.error('Error al eliminar reseña:', error);
      return { success: false, message: 'Error de red al intentar eliminar la reseña.' };
    }
  },

  saveProductoCompleto: async (form: any, specs: any[], images: File[]): Promise<ApiResponse<any>> => {
    try {
      const formData = new FormData();
      
      // 1. Datos Básicos
      formData.append('nombre', form.nombre);
      formData.append('precio_base', form.precio_base.toString());
      formData.append('descripcion', form.descripcion || '');
      formData.append('sku', form.sku || '');
      formData.append('id_categoria', form.id_categoria || ''); 
      formData.append('stock_inicial', form.stock_inicial); // Ajustable según necesidad

      // 2. Especificaciones (Filtradas y convertidas a JSON)
      const validSpecs = specs.filter(s => s.clave && s.valor);
      formData.append('especificaciones', JSON.stringify(validSpecs));

      // 3. Imágenes Binarias
      images.forEach((file) => {
        formData.append('imagenes', file);
      });

      // Lógica para saber si es Editar (PUT) o Nuevo (POST)
      const isEdit = !!form.id_producto;
      const url = isEdit 
        ? `${API_BASE_URL}/api/productos/${form.id_producto}` 
        : `${API_BASE_URL}/api/productos/nuevo`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        // ¡OJO!: NO usamos getAuthHeaders() aquí porque no queremos el 'Content-Type: application/json'
        // El navegador debe generar el header multipart/form-data automáticamente.
        headers: {
          'Authorization': `Bearer ${TEMP_TOKEN}` 
        },
        body: formData
      });

      return await response.json();
    } catch (error: any) {
      console.error('Error en saveProductoCompleto:', error);
      return { success: false, message: 'Error de red al guardar el producto completo.' };
    }
  },
  // ==========================================
  // OBTENER CATEGORÍAS
  // ==========================================
  getCategorias: async (): Promise<ApiResponse<any[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/productos/categorias`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error: any) {
      console.error('Error en getCategorias:', error);
      return { success: false, message: 'Error al obtener categorías' };
    }
  },
  // ==========================================
  // ELIMINAR PRODUCTO
  // ==========================================
  eliminarProducto: async (idProducto: string): Promise<ApiResponse<any>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/productos/${idProducto}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error: any) {
      console.error('Error al eliminar producto:', error);
      return { success: false, message: 'Error de red al intentar eliminar.' };
    }
  },

  // ==========================================
  // SERVICIO DE PROMOCIONES (MÓDULO ADMIN)
  // ==========================================
  getPromocionesAdmin: async (): Promise<{success: boolean, tienda_actual?: string, data?: PromocionAdmin[], message?: string}> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/productos/promociones/admin`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, message: 'No se pudo obtener el catálogo de promociones.' };
    }
  },

  guardarPromocion: async (id_producto: string, descuento: number, fecha_inicio: string, fecha_fin: string): Promise<ApiResponse<any>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/productos/promociones/admin/guardar`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id_producto, descuento, fecha_inicio, fecha_fin })
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, message: 'Error de red al guardar promoción.' };
    }
  },
};


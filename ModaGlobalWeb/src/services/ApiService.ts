// src/services/api.service.ts
import { type Producto } from '../types/Producto'; 

// 1. Cargamos las variables de entorno de Vite
const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000';

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

// 3. Función Helper para obtener el token del localStorage
const getToken = (): string | null => {
  return localStorage.getItem('mg_token');
};

// 4. Función Helper para inyectar el Token en las peticiones
const getAuthHeaders = (): HeadersInit => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

// 5. Función para headers de FormData (multipart)
const getFormDataHeaders = (): HeadersInit => {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // NO poner Content-Type, el navegador lo setea automáticamente con el boundary
  return headers;
};

// 6. Verificar autenticación antes de cada petición (opcional)
const checkAuth = (): boolean => {
  const token = getToken();
  if (!token) {
    console.warn('[api.service] No hay token de autenticación');
    return false;
  }
  return true;
};

// 7. Objeto de Servicios
export const apiService = {
  
  // -- SERVICIO DE INVENTARIO --
  getProductoStock: async (productoId: string): Promise<ApiResponse<StockItem[]>> => {
    try {
      if (!checkAuth()) {
        return { success: false, message: 'No autenticado. Por favor inicia sesión.' };
      }

      const response = await fetch(`${API_BASE_URL}/api/inventario/stock/${productoId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (response.status === 401 || response.status === 403) {
        return { success: false, message: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
      }
      
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
        headers: getAuthHeaders(),
      });
      
      if (response.status === 401 || response.status === 403) {
        return { success: false, message: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
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
      if (!checkAuth()) {
        return { success: false, message: 'No autenticado. Por favor inicia sesión.' };
      }

      const response = await fetch(`${API_BASE_URL}/api/productos/${id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (response.status === 401 || response.status === 403) {
        return { success: false, message: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
      }
      
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error: any) {
      console.error('Error en getProductoById:', error);
      return { success: false, message: 'No se pudo obtener el detalle del producto.' };
    }
  },

  getResena: async (id: string): Promise<ApiResponse<Producto>> => {
    try {
      if (!checkAuth()) {
        return { success: false, message: 'No autenticado. Por favor inicia sesión.' };
      }

      const response = await fetch(`${API_BASE_URL}/api/productos/${id}/resenas`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (response.status === 401 || response.status === 403) {
        return { success: false, message: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
      }
      
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error: any) {
      console.error('Error en getresena', error);
      return { success: false, message: 'No se pudieron obtener las reseñas.' };
    }
  },

  // Flujo para crear reseñas
  crearResena: async (id_producto: string, calificacion: number, comentario: string): Promise<ApiResponse<any>> => {
    try {
      if (!checkAuth()) {
        return { success: false, message: 'No autenticado. Por favor inicia sesión.' };
      }

      const response = await fetch(`${API_BASE_URL}/api/productos/resenas`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id_producto, calificacion, comentario })
      });
      
      if (response.status === 401 || response.status === 403) {
        return { success: false, message: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
      }
      
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
      if (!checkAuth()) {
        return { success: false, message: 'No autenticado. Por favor inicia sesión.' };
      }

      const formData = new FormData();
      
      // 1. Datos Básicos
      formData.append('nombre', form.nombre);
      formData.append('precio_base', form.precio_base.toString());
      formData.append('descripcion', form.descripcion || '');
      formData.append('sku', form.sku || '');
      formData.append('id_categoria', form.id_categoria || ''); 
      
      // Aseguramos que stock_inicial viaje como string y no como número para que FormData no falle
      formData.append('stock_inicial', String(form.stock_inicial || '0')); 

      // 2. Especificaciones
      const validSpecs = specs.filter(s => s.clave && s.valor);
      formData.append('especificaciones', JSON.stringify(validSpecs));

      // 3. Imágenes
      images.forEach((file) => {
        formData.append('imagenes', file);
      });

      const isEdit = !!form.id_producto;
      const url = isEdit 
        ? `${API_BASE_URL}/api/productos/${form.id_producto}` 
        : `${API_BASE_URL}/api/productos/nuevo`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getFormDataHeaders(), // Usar headers sin Content-Type
        body: formData
      });

      if (response.status === 401 || response.status === 403) {
        return { success: false, message: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error en saveProductoCompleto:', error);
      return { success: false, message: 'Error de red al guardar el producto completo.' };
    }
  },

  // OBTENER CATEGORÍAS
  getCategorias: async (): Promise<ApiResponse<any[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/productos/categorias`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (response.status === 401 || response.status === 403) {
        return { success: false, message: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Error en getCategorias:', error);
      return { success: false, message: 'Error al obtener categorías' };
    }
  },

  // ELIMINAR PRODUCTO
  eliminarProducto: async (idProducto: string): Promise<ApiResponse<any>> => {
    try {
      if (!checkAuth()) {
        return { success: false, message: 'No autenticado. Por favor inicia sesión.' };
      }

      const response = await fetch(`${API_BASE_URL}/api/productos/${idProducto}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      
      if (response.status === 401 || response.status === 403) {
        return { success: false, message: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
      }
      
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
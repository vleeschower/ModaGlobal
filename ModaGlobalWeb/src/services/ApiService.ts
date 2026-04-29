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
  
  // ✨ NUEVOS CAMPOS PARA EL PANEL DE ADMINISTRACIÓN
  contexto?: string;
  rol?: string;
  tienda_actual?: string;
}

// Interfaz añadida para evitar errores de compilación en getPromocionesAdmin
export interface PromocionAdmin {
  id_promocion?: string;
  id_producto: string;
  descuento: number;
  fecha_inicio: string;
  fecha_fin: string;
  [key: string]: any; 
}

// 3. Función Helper para obtener el token del localStorage
const getToken = (): string | null => {
  return localStorage.getItem('mg_token');
};

// 4. Función Helper para inyectar el Token en las peticiones
// 4. Función Helper para inyectar el Token y la TIENDA en las peticiones
const getAuthHeaders = (): HeadersInit => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // ✨ LA MAGIA OMNICANAL: Le decimos al backend qué tienda estamos viendo
  const tiendaSeleccionada = localStorage.getItem('mg_tienda_seleccionada') || 'tnd-matriz';
  headers['x-tienda-cercana'] = tiendaSeleccionada;

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

  // ✨ NUEVA FUNCIÓN: Obtener todas las tiendas
  getTiendas: async (): Promise<ApiResponse<any[]>> => {
    try {
      if (!checkAuth()) {
        return { success: false, message: 'No autenticado. Por favor inicia sesión.' };
      }

      const response = await fetch(`${API_BASE_URL}/api/inventario/tiendas`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (response.status === 401 || response.status === 403) {
        return { success: false, message: 'Sesión expirada. Por favor inicia sesión nuevamente.' };
      }
      
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error en getTiendas:', error);
      return { success: false, message: 'Error al consultar la lista de tiendas.' };
    }
  },

  // 🔓 OBTENER TIENDAS PARA EL HEADER (Público)
  getTiendasPublicas: async (): Promise<ApiResponse<any[]>> => {
    try {
      // Usamos la nueva ruta que acabamos de crear en el backend
      const response = await fetch(`${API_BASE_URL}/api/inventario/publicas`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Opcional: puedes inyectar el token si existe usando getToken(), 
          // pero NO interrumpimos la petición si no lo hay.
        },
      });
      
      if (!response.ok) {
         throw new Error(`Error HTTP al cargar tiendas: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error en getTiendasPublicas:', error);
      return { success: false, message: 'Fallo al conectar con el servidor de sucursales.' };
    }
  },

  solicitarStock: async (id_producto: string, cantidad: number): Promise<ApiResponse<any>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventario/solicitudes`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ id_producto, cantidad })
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, message: 'Error de red al solicitar stock.' };
    }
  },

  // En src/services/api.service.ts (dentro de apiService)

  // Obtener solicitudes de stock
  getSolicitudesStock: async (): Promise<ApiResponse<any[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventario/solicitudes`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, message: 'Error de red al obtener las solicitudes.' };
    }
  },

  // Responder a una solicitud (SuperAdmin)
  responderSolicitudStock: async (id_solicitud: string, accion: 'APROBAR' | 'RECHAZAR'): Promise<ApiResponse<any>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/inventario/solicitudes/${id_solicitud}/responder`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ accion })
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, message: 'Error de red al responder la solicitud.' };
    }
  },

  // En apiService dentro de ApiService.ts
  getTiendasPaginadas: async (page = 1, search = '', region = ''): Promise<ApiResponse<any[]>> => {
    try {
      // Cambiamos /admin/lista por /tiendas
      const url = `${API_BASE_URL}/api/inventario/tiendas?page=${page}&search=${encodeURIComponent(search)}&region=${encodeURIComponent(region)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (response.status === 401 || response.status === 403) {
        return { success: false, message: 'Sesión expirada o sin permisos.' };
      }
      
      if (!response.ok) {
         throw new Error(`Error HTTP: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error en getTiendasPaginadas:', error);
      return { success: false, message: 'Error de conexión con el servicio de tiendas.' };
    }
  },

 // OBTENER INVENTARIO EN RED (Paginado para el nuevo Dashboard de Inventarios)
  getInventarioRed: async (page: number = 1, limit: number = 10, search: string = '', sort: string = 'newest'): Promise<ApiResponse<any[]>> => {
    try {
      if (!checkAuth()) {
        return { success: false, message: 'No autenticado. Por favor inicia sesión.' };
      }

      // ✨ ACTUALIZADO: Añadimos el parámetro sort a la URL
      const url = `${API_BASE_URL}/api/productos/inventario/red?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&sort=${sort}`;
      
      const response = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
      
      if (response.status === 401 || response.status === 403) return { success: false, message: 'Sesión expirada.' };
      
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      
      return await response.json();
    } catch (error) {
      console.error('Error en getInventarioRed:', error);
      return { success: false, message: 'Error de red al obtener el inventario global.' };
    }
  },

// -- SERVICIO DE PRODUCTOS --
  getProductos: async (page: number = 1, limit: number = 12): Promise<ApiResponse<Producto[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/productos?page=${page}&limit=${limit}`, {
        method: 'GET',
        // Seguimos enviando getAuthHeaders() por si hay un token, pero si no lo hay, 
        // fetch enviará la petición vacía y el backend lo dejará pasar.
        headers: getAuthHeaders(), 
      });
      
      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
      
      return await response.json();
    } catch (error: any) {
      console.error('Error en getProductos:', error);
      return { success: false, message: error.message || 'No se pudo cargar el catálogo.' };
    }
  },

  getProductoById: async (id: string): Promise<ApiResponse<Producto>> => {
    try {
      // 🚨 ELIMINAMOS el bloque de checkAuth() porque cualquiera puede ver un producto

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

  getProductosListaAdmin: async (page: number = 1, limit: number = 10, search: string = '', sort: string = 'newest'): Promise<ApiResponse<any[]>> => {
    try {
      if (!checkAuth()) {
        return { success: false, message: 'No autenticado. Por favor inicia sesión.' };
      }

      // ✨ SE ENVIAN LA BÚSQUEDA Y EL ORDEN
      const url = `${API_BASE_URL}/api/productos/admin/lista?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&sort=${sort}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      
      if (response.status === 401 || response.status === 403) {
        return { success: false, message: 'Sesión expirada o no tienes permisos.' };
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('Error en getProductosListaAdmin:', error);
      return { success: false, message: 'Error de red al obtener la tabla de productos.' };
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

  // ✨ ACTUALIZADO: Soporte para Identificador de Imagen Principal y Eliminación
// ✨ ACTUALIZADO: Soporte total para Galería Dinámica
  saveProductoCompleto: async (form: any, specs: any[], images: File[], mainImageId?: string, mainImageIndex?: number, imagesToDelete?: string[]): Promise<ApiResponse<any>> => {
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
      formData.append('stock_inicial', String(form.stock_inicial || '0')); 

      // 2. Especificaciones
      const validSpecs = specs.filter(s => s.clave && s.valor);
      formData.append('especificaciones', JSON.stringify(validSpecs));

      // 3. Imágenes y Lógica Principal
      images.forEach((file) => {
        formData.append('imagenes', file);
      });

      // Lógica de portada y borrado
      if (mainImageId) formData.append('mainImageId', mainImageId);
      if (mainImageIndex !== undefined && mainImageIndex !== -1) formData.append('mainImageIndex', String(mainImageIndex));
      if (imagesToDelete && imagesToDelete.length > 0) formData.append('imagesToDelete', JSON.stringify(imagesToDelete));

      const isEdit = !!form.id_producto;
      const url = isEdit 
        ? `${API_BASE_URL}/api/productos/${form.id_producto}` 
        : `${API_BASE_URL}/api/productos/nuevo`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getFormDataHeaders(),
        body: formData
      });

      if (response.status === 401 || response.status === 403) return { success: false, message: 'Sesión expirada.' };

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
  getPromocionesAdmin: async (page: number = 1, limit: number = 10, search: string = '', sort: string = 'newest'): Promise<ApiResponse<PromocionAdmin[]>> => {
    try {
      const url = `${API_BASE_URL}/api/productos/promociones/admin?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&sort=${sort}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, message: 'No se pudo obtener el catálogo de promociones.' };
    }
  },

  // En api.service.ts
  guardarPromocion: async (id_producto: string, descuento: number, fecha_inicio: string, fecha_fin: string, id_tienda?: string): Promise<ApiResponse<any>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/productos/promociones/admin/guardar`, {
        method: 'POST',
        headers: getAuthHeaders(),
        // ✨ Agregamos id_tienda al body por si el SuperAdmin lo necesita
        body: JSON.stringify({ id_producto, descuento, fecha_inicio, fecha_fin, id_tienda }) 
      });
      return await response.json();
    } catch (error: any) {
      return { success: false, message: 'Error de red al guardar promoción.' };
    }
  },
};
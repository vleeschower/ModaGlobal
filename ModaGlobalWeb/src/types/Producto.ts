// src/types/Producto.ts

export interface ImagenProducto {
  imagen_url: string;
  orden: number;
  es_principal?: boolean;
}

export interface EspecificacionProducto {
  clave: string;
  valor: string;
}

export interface RatingProducto {
  total: number;
  promedio: number;
}

export interface ResenaReciente {
  id_resena: string;
  id_usuario: string;
  calificacion: number;
  comentario: string;
  created_at: string;
}

export interface Producto {
  id_producto: string;
  nombre: string;
  descripcion?: string;
  id_categoria?: string;
  precio_base: number;
  sku?: string;
  imagen_url?: string;
  nombre_categoria?: string;
  tiene_stock: boolean;
  stock_inicial?: number; // Nuevo campo para el stock inicial al crear un producto
  
  // -- NUEVOS CAMPOS DEL BACKEND --
  galeria?: ImagenProducto[];
  especificaciones?: EspecificacionProducto[];
  rating?: RatingProducto;
  reseñas_recientes?: ResenaReciente[];
}
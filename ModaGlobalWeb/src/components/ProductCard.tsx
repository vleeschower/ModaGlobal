import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { type Producto } from '../types/Producto';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/ApiService';

interface ProductCardProps {
    product: Producto;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
    const imageUrl = product.imagen_url || 'https://via.placeholder.com/500?text=Sin+Imagen';
    const { isAdmin } = useAuth();
    
    // Estados para el Modal de Eliminación
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Abre el modal previniendo que se abra el enlace del producto
    const triggerDelete = (e: React.MouseEvent) => {
        e.preventDefault(); 
        setShowDeleteModal(true);
    };

    // Ejecuta la eliminación real
    const confirmDelete = async () => {
        setIsDeleting(true);
        const res = await apiService.eliminarProducto(product.id_producto);
        
        if (res.success) {
            setShowDeleteModal(false);
            // Recargamos la página para que el catálogo traiga la lista fresca (sin el eliminado)
            window.location.reload(); 
        } else {
            alert(res.message || 'Error al eliminar el producto');
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="group bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full relative">
                
                <Link to={`/producto/${product.id_producto}`} className="flex flex-col h-full">
                    <div className="aspect-4/3 bg-gray-50 relative overflow-hidden">
                        <img 
                            src={imageUrl} 
                            alt={product.nombre}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                        />
                        {product.nombre_categoria && (
                            <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded uppercase text-slate-700 tracking-wider shadow-sm">
                                {product.nombre_categoria}
                            </span>
                        )}
                    </div>
                    
                    <div className="p-4 flex flex-col grow">
                        <h4 className="font-bold text-slate-800 text-base mb-1 line-clamp-2 group-hover:text-emerald-500 transition-colors">
                            {product.nombre}
                        </h4>
                        <p className="text-gray-500 text-sm mb-4 line-clamp-2 grow">
                            {product.descripcion || 'Sin descripción disponible.'}
                        </p>
                        
                        <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-50">
                            <span className="text-emerald-500 font-black text-xl">
                                ${Number(product.precio_base).toFixed(2)}
                            </span>
                        </div>
                    </div>
                </Link>

                {/* Botón del Carrito */}
                <button 
                    onClick={(e) => { e.preventDefault(); }}
                    className="absolute bottom-4 right-4 bg-slate-900 text-white p-2.5 rounded-full hover:bg-emerald-500 transition-all shadow-md active:scale-90"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                    </svg>
                </button>

                {/* PANEL DE ADMIN FLOTANTE */}
                {isAdmin && (
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Link 
                            to={`/admin/producto/editar/${product.id_producto}`} 
                            className="bg-white/80 backdrop-blur border border-blue-100 p-2 rounded-lg text-blue-600 hover:bg-blue-600 hover:text-white transition-colors shadow-sm"
                            title="Editar Producto"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </Link>
                        
                        <button 
                            onClick={triggerDelete}
                            className="bg-white/80 backdrop-blur border border-red-100 p-2 rounded-lg text-red-600 hover:bg-red-600 hover:text-white transition-colors shadow-sm"
                            title="Eliminar Producto"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* ✨ MODAL DE ELIMINACIÓN ✨ */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transform transition-all scale-100 opacity-100">
                        
                        {/* Alerta Visual */}
                        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        
                        <h3 className="text-xl font-black text-slate-900 mb-2">¿Eliminar producto?</h3>
                        <p className="text-gray-500 mb-6 text-sm">Esta acción ocultará el producto del catálogo de ModaGlobal.</p>
                        
                        {/* Vista previa del producto a eliminar */}
                        <div className="bg-gray-50 p-3 rounded-xl flex items-center gap-4 mb-8 text-left border border-gray-100">
                            <img src={imageUrl} alt={product.nombre} className="w-12 h-12 rounded-lg object-cover" />
                            <span className="font-bold text-slate-700 text-sm line-clamp-2">{product.nombre}</span>
                        </div>
                        
                        {/* Botones de acción */}
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                                className="flex-1 bg-gray-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition-colors shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center"
                            >
                                {isDeleting ? 'Borrando...' : 'Sí, eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProductCard;
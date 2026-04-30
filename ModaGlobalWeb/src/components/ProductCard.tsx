import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { type Producto } from '../types/Producto';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/ApiService';

interface ProductCardProps {
    product: Producto;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
    const imagenUrl = product.imagen_url || 'https://via.placeholder.com/500?text=Sin+Imagen';
    const { isSuperAdmin } = useAuth();
    
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // ✨ LÓGICA OMNICANAL: Precios y Stock
    const isAgotado = (product.stock_local === undefined || product.stock_local <= 0);
    const hasPromo = product.descuento_local && product.descuento_local > 0;
    const precioOriginal = Number(product.precio_base);
    const precioFinal = hasPromo 
        ? precioOriginal - (precioOriginal * (Number(product.descuento_local) / 100)) 
        : precioOriginal;

    const triggerDelete = (e: React.MouseEvent) => {
        e.preventDefault(); 
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        const res = await apiService.eliminarProducto(product.id_producto);
        if (res.success) {
            setShowDeleteModal(false);
            window.location.reload(); 
        } else {
            alert(res.message || 'Error al eliminar el producto');
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className={`group bg-white rounded-3xl overflow-hidden hover:shadow-md transition-shadow duration-300 border border-gray-100 flex flex-col h-full relative ${isAgotado ? 'opacity-80 grayscale-20%' : ''}`}>
                
                {/* Envolvemos la imagen y la info en el Link, pero dejamos el botón fuera para evitar conflictos de clicks */}
                <Link to={`/producto/${product.id_producto}`} className="flex flex-col grow">
                    
                    <div className="aspect-4/3 bg-[#E9ECEF] relative overflow-hidden">
                        <img 
                            src={imagenUrl} 
                            alt={product.nombre}
                            className={`w-full h-full object-cover transition-transform duration-500 ${isAgotado ? '' : 'group-hover:scale-105'}`} 
                        />
                        
                        {/* Etiquetas Flotantes */}
                        <div className="absolute top-3 left-3 flex flex-col gap-2">
                            {product.nombre_categoria && (
                                <span className="bg-white/90 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded uppercase text-slate-700 tracking-wider shadow-sm w-max">
                                    {product.nombre_categoria}
                                </span>
                            )}
                            {isAgotado && (
                                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest shadow-sm w-max">
                                    AGOTADO
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <div className="p-5 flex flex-col grow">
                        <div className="flex justify-between items-start mb-1 gap-2">
                            <h4 className={`font-bold text-sm md:text-base line-clamp-2 ${isAgotado ? 'text-gray-500' : 'text-slate-800'}`}>
                                {product.nombre}
                            </h4>
                            {/* Etiqueta de descuento estilo Home */}
                            {hasPromo && !isAgotado && (
                                <span className="bg-red-50 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase whitespace-nowrap mt-0.5">
                                    -{product.descuento_local}%
                                </span>
                            )}
                        </div>
                        
                        {isAgotado ? (
                            <p className="text-red-500 text-xs font-bold mb-4 flex items-center gap-1 grow">
                                <span className="material-symbols-outlined text-[14px]">storefront</span>
                                Últimas unidades vendidas
                            </p>
                        ) : (
                            <p className="text-gray-400 text-xs mb-4 grow line-clamp-2">
                                {product.descripcion || 'Sin descripción disponible.'}
                            </p>
                        )}
                        
                        {/* Precios actualizados al diseño retail */}
                        <div className="flex flex-col gap-3 mt-auto">
                            <div className="flex items-center gap-2">
                                <span className={`${isAgotado ? 'text-gray-400' : 'text-primary-esmeralda'} font-black text-lg`}>
                                    ${precioFinal.toFixed(2)}
                                </span>
                                {hasPromo && !isAgotado && (
                                    <span className="text-gray-400 line-through text-xs font-medium">
                                        ${precioOriginal.toFixed(2)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </Link>

                {/* Botón del Carrito estilo Home (Fuera del Link) */}
                <div className="px-5 pb-5 pt-0">
                    <button 
                        onClick={(e) => { 
                            e.preventDefault(); 
                            if(!isAgotado) {
                                console.log('Añadir al carrito', product.id_producto);
                                // Aquí puedes llamar a tu contexto addToCart similar al Home
                            }
                        }}
                        disabled={isAgotado}
                        className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                            isAgotado 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-100' 
                            : 'bg-gray-50 text-slate-800 border border-gray-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-500'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[18px]">
                            {isAgotado ? 'remove_shopping_cart' : 'shopping_cart'}
                        </span>
                        {isAgotado ? 'Agotado' : 'Agregar'}
                    </button>
                </div>

                {/* PANEL DE ADMIN FLOTANTE */}
                {isSuperAdmin && (
                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
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

            {/* ✨ MODAL DE ELIMINACIÓN ✨ (Se mantiene exactamente igual) */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transform transition-all scale-100 opacity-100">
                        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">¿Eliminar producto?</h3>
                        <p className="text-gray-500 mb-6 text-sm">Esta acción ocultará el producto del catálogo de ModaGlobal.</p>
                        
                        <div className="bg-gray-50 p-3 rounded-xl flex items-center gap-4 mb-8 text-left border border-gray-100">
                            <img src={imagenUrl} alt={product.nombre} className="w-12 h-12 rounded-lg object-cover" />
                            <span className="font-bold text-slate-700 text-sm line-clamp-2">{product.nombre}</span>
                        </div>
                        
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
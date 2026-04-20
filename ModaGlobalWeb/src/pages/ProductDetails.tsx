import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/ApiService'; 
import { type Producto } from '../types/Producto';
import Header from '../components/header';
import Footer from '../components/footer';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext'; // <-- AÑADIDO: Necesario para extraer los roles

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isSuperAdmin } = useAuth(); // Sacamos el rol

  const [product, setProduct] = useState<Producto | null>(null);
  const [related, setRelated] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'descripcion' | 'resenas'>('descripcion');
  const [mainImage, setMainImage] = useState<string>('');

  // Estados Formulario
  const [newReviewRating, setNewReviewRating] = useState(0);
  const [newReviewText, setNewReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<{type: 'error', text: string} | null>(null);
  
  // ✨ NUEVO ESTADO: Controla la visibilidad del Modal de Éxito
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ✨ MEJORA: Agregamos el parámetro 'showSpinner' para recargas silenciosas
  const loadData = async (showSpinner = true) => {
    if (!id) return;
    if (showSpinner) setLoading(true); // Solo mostramos la pantalla de carga si es necesario
    
    const res = await apiService.getProductoById(id);
    
    if (res.success && res.data) {
      setProduct(res.data);
      setMainImage(res.data.imagen_url || res.data.galeria?.[0]?.imagen_url || 'https://via.placeholder.com/800?text=Sin+Imagen');
      
      const relRes = await apiService.getProductos(1, 4);
      if (relRes.success && relRes.data) {
        setRelated(relRes.data.filter(p => p.id_producto !== id));
      }
    }
    if (showSpinner) setLoading(false);
  };

  useEffect(() => {
    loadData(true); // Al entrar a la página por primera vez, SÍ queremos el spinner
    window.scrollTo(0, 0);
  }, [id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newReviewRating === 0) {
        setReviewMessage({ type: 'error', text: 'Por favor, selecciona una calificación (estrellas).' });
        return;
    }
    if (!id) return;

    setIsSubmitting(true);
    setReviewMessage(null);

    const res = await apiService.crearResena(id, newReviewRating, newReviewText);
    
    if (res.success) {
        // ✨ MAGIA UX: Limpiamos el formulario, mostramos el modal y recargamos los datos en silencio
        setNewReviewText('');
        setNewReviewRating(0);
        setShowSuccessModal(true); 
        loadData(false); // <-- false = Recarga Silenciosa de las estrellas y los comentarios
    } else {
        setReviewMessage({ type: 'error', text: res.message || 'Error al publicar la reseña.' });
    }
    setIsSubmitting(false);
  };

  // Función base para que el botón de Admin no rompa la app
  const handleEliminarResena = async (id_resena: any) => {
      if(window.confirm('¿Estás seguro de que deseas eliminar esta reseña?')) {
          // TODO: Conectar con tu apiService.eliminarResena cuando exista
          console.log('Eliminar reseña:', id_resena);
          alert('Función de eliminar reseña en desarrollo');
      }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <svg 
        key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" 
        className={`w-4 h-4 ${i < Math.round(rating) ? 'text-amber-400' : 'text-gray-300'}`}
      >
        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006z" clipRule="evenodd" />
      </svg>
    ));
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface font-sans">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!product) return <div className="p-20 text-center font-sans text-slate-800">Producto no encontrado en el catálogo.</div>;

  return (
    <div className="bg-surface min-h-screen flex flex-col font-sans relative">
      <Header />
      
      <main className="grow max-w-1440px mx-auto w-full px-6 md:px-16 py-8">
        {/* NAVEGACIÓN Y BOTÓN ADMIN DE EDICIÓN RÁPIDA (Unificados) */}
        <div className="flex justify-between items-center mb-8">
            <nav className="flex items-center gap-2 text-sm text-gray-400">
                <Link to="/" className="hover:text-emerald-500 transition-colors">Inicio</Link> 
                <span>/</span> 
                <Link to="/catalogo" className="hover:text-emerald-500 transition-colors">Catálogo</Link> 
                <span>/</span> 
                <span className="text-slate-900 font-medium truncate">{product.nombre}</span>
            </nav>

            {isSuperAdmin && (
                <Link to={`/admin/producto/editar/${product.id_producto}`} className="bg-gray-100 text-gray-600 font-bold px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition-colors flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    Editar Producto
                </Link>
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          {/* GALERÍA */}
          <div className="space-y-4">
            <div className="aspect-square bg-gray-50 rounded-3xl overflow-hidden border border-gray-100 flex items-center justify-center">
              <img src={mainImage} className="w-full h-full object-cover transition-opacity duration-300" alt={product.nombre}/>
            </div>
            
            {product.galeria && product.galeria.length > 0 && (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                {product.imagen_url && (
                    <button 
                      onClick={() => setMainImage(product.imagen_url!)}
                      className={`w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${mainImage === product.imagen_url ? 'border-emerald-500 shadow-md' : 'border-transparent hover:border-gray-200'}`}
                    >
                      <img src={product.imagen_url} alt="Principal" className="w-full h-full object-cover" />
                    </button>
                )}
                {product.galeria.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setMainImage(img.imagen_url)}
                    className={`w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${mainImage === img.imagen_url ? 'border-emerald-500 shadow-md' : 'border-transparent hover:border-gray-200'}`}
                  >
                    <img src={img.imagen_url} alt={`Vista ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* INFORMACIÓN */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-500 font-bold uppercase tracking-widest text-xs">
                {product.nombre_categoria || 'General'}
                </span>
                {product.rating && product.rating.total > 0 && (
                    <div className="flex items-center gap-1 cursor-pointer" onClick={() => setActiveTab('resenas')}>
                        <div className="flex">{renderStars(product.rating.promedio)}</div>
                        <span className="text-xs text-gray-500 ml-1 hover:text-emerald-500 transition-colors">({product.rating.total} reseñas)</span>
                    </div>
                )}
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight mb-4">
              {product.nombre}
            </h1>
            
            <div className="flex items-center gap-4 mb-6">
              <span className="text-3xl font-black text-slate-900">
                ${Number(product.precio_base).toFixed(2)}
              </span>
            </div>

            <p className="text-gray-500 text-lg leading-relaxed mb-8">
              {product.descripcion || 'Este producto no tiene una descripción detallada todavía.'}
            </p>

            <div className="space-y-6 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-6">
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 h-14">
                  <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="px-5 h-full hover:bg-gray-200 transition-colors font-bold">-</button>
                  <span className="px-6 font-bold text-slate-900 w-12 text-center">{quantity}</span>
                  <button onClick={() => setQuantity(q => q+1)} className="px-5 h-full hover:bg-gray-200 transition-colors font-bold">+</button>
                </div>
                <button className="flex-1 h-14 bg-slate-900 text-white rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 active:scale-95">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                  </svg>
                  Añadir al carrito
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <section className="mb-20">
          <div className="flex border-b border-gray-200 gap-8 mb-8">
            <button 
                onClick={() => setActiveTab('descripcion')}
                className={`pb-4 font-bold transition-all ${activeTab === 'descripcion' ? 'border-b-2 border-emerald-500 text-slate-900' : 'text-gray-400 hover:text-slate-600'}`}
            >
                Especificaciones
            </button>
            <button 
                onClick={() => setActiveTab('resenas')}
                className={`pb-4 font-bold transition-all ${activeTab === 'resenas' ? 'border-b-2 border-emerald-500 text-slate-900' : 'text-gray-400 hover:text-slate-600'}`}
            >
                Reseñas ({product.rating?.total || 0})
            </button>
          </div>

          <div className="min-h-200px">
              {activeTab === 'descripcion' && (
                <div className="max-w-3xl">
                    {product.especificaciones && product.especificaciones.length > 0 ? (
                        <div className="border border-gray-200 rounded-2xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <tbody className="divide-y divide-gray-200">
                                    {product.especificaciones.map((spec, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <th className="px-6 py-4 font-medium text-slate-900 bg-gray-50/50 w-1/3">{spec.clave}</th>
                                            <td className="px-6 py-4 text-gray-600">{spec.valor}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-500 italic">No hay especificaciones técnicas registradas para este producto.</p>
                    )}
                </div>
              )}

              {activeTab === 'resenas' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-6">
                        {product.reseñas_recientes && product.reseñas_recientes.length > 0 ? (
                            product.reseñas_recientes.map((resena) => (
                                <div key={resena.id_resena} className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold uppercase">
                                                {resena.id_usuario.substring(0, 2)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm">Usuario {resena.id_usuario.substring(0, 5)}...</p>
                                                <p className="text-xs text-gray-400">{new Date(resena.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex">{renderStars(resena.calificacion)}</div>
                                    </div>
                                    <p className="text-gray-600 text-sm leading-relaxed">{resena.comentario}</p>
                                    
                                    {/* ✨ BOTÓN ADMIN: ELIMINAR RESEÑA */}
                                    {isSuperAdmin && (
                                        <div className="mt-4 pt-3 border-t border-red-50 flex justify-end">
                                            <button onClick={() => handleEliminarResena(resena.id_resena)} className="text-xs text-red-500 font-bold hover:underline">
                                                Eliminar Reseña (SuperAdmin)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <p className="text-gray-500">Aún no hay reseñas para este producto.</p>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200 sticky top-24">
                            <h3 className="font-bold text-slate-900 text-lg mb-4">Deja tu opinión</h3>
                            
                            {reviewMessage && reviewMessage.type === 'error' && (
                                <div className="p-3 rounded-lg mb-4 text-sm font-bold bg-red-100 text-red-600">
                                    {reviewMessage.text}
                                </div>
                            )}

                            <form onSubmit={handleSubmitReview} className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-slate-700 mb-2">Calificación</p>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button 
                                                key={star} type="button" onClick={() => setNewReviewRating(star)}
                                                className="focus:outline-none transition-transform hover:scale-110"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" 
                                                  className={`w-8 h-8 ${newReviewRating >= star ? 'text-amber-400' : 'text-gray-300 hover:text-amber-200'}`}>
                                                  <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700 mb-2">Comentario (opcional)</p>
                                    <textarea 
                                        value={newReviewText} onChange={(e) => setNewReviewText(e.target.value)}
                                        className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none h-24 text-sm"
                                        placeholder="¿Qué te pareció este producto?"
                                    />
                                </div>
                                <button 
                                    type="submit" disabled={isSubmitting}
                                    className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-md hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Enviando...' : 'Publicar reseña'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
              )}
          </div>
        </section>

        {related.length > 0 && (
          <section>
            <h2 className="text-2xl font-black text-slate-900 mb-8">También te podría gustar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map(item => (
                <ProductCard key={item.id_producto} product={item} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />

      {/* ✨ MODAL DE ÉXITO FLOTANTE ✨ */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transform transition-all scale-100 opacity-100">
            
            <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-2">¡Reseña Publicada!</h3>
            <p className="text-gray-500 mb-8">Gracias por compartir tu opinión. Nos ayuda a mejorar ModaGlobal.</p>
            
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-emerald-500 transition-colors shadow-lg active:scale-95"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductDetails;
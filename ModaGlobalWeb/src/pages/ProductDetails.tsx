import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/ApiService'; 
import { type Producto } from '../types/Producto';
import Header from '../components/header';
import Footer from '../components/footer';
import ProductCard from '../components/ProductCard';
import { useAuth } from '../context/AuthContext';

// DICCIONARIO DE PROFANITY FILTER (Auto-sanitización)
const PALABRAS_PROHIBIDAS = ['pinche', 'mierda', 'basura', 'puto', 'pendejo', 'carajo', 'estúpido', 'idiota'];
const sanitizarTexto = (texto: string) => {
    let textoLimpio = texto;
    PALABRAS_PROHIBIDAS.forEach(palabra => {
        const regex = new RegExp(`\\b${palabra}\\b`, 'gi'); 
        textoLimpio = textoLimpio.replace(regex, '***');
    });
    return textoLimpio;
};

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth(); // Sacamos el rol

  const [product, setProduct] = useState<Producto | null>(null);
  const [related, setRelated] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'descripcion' | 'resenas'>('descripcion');
  const [mainImage, setMainImage] = useState<string>('');

  // ✨ NUEVO ESTADO: Stock en vivo desde el Microservicio de Inventarios
  const [stockDisponible, setStockDisponible] = useState<number | null>(null);

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
    if (showSpinner) setLoading(true);
    
    // 1. Obtenemos datos del catálogo (Microservicio de Productos)
    const res = await apiService.getProductoById(id);
    
    if (res.success && res.data) {
      setProduct(res.data);
      setMainImage(res.data.imagen_url || res.data.galeria?.[0]?.imagen_url || 'https://via.placeholder.com/800');
      
      // 2. Obtenemos el STOCK en tiempo real (Microservicio de Inventarios)
      const resStock = await apiService.getProductoStock(id);
      if (resStock.success && resStock.data && resStock.data.length > 0) {
          // Asumiendo que el item [0] es la tienda principal
          setStockDisponible(resStock.data[0].stock_disponible);
      } else {
          setStockDisponible(0); // Si no hay registro, asumimos 0
      }

      // Productos Relacionados
      const relRes = await apiService.getProductos(1, 4);
      if (relRes.success && relRes.data) {
        setRelated(relRes.data.filter(p => p.id_producto !== id));
      }
    }
    if (showSpinner) setLoading(false);
  };

useEffect(() => { loadData(true); window.scrollTo(0, 0); }, [id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newReviewRating === 0) { setReviewMessage({ type: 'error', text: 'Califica con estrellas.' }); return; }
    if (!id) return;

    setIsSubmitting(true);
    const textoLimpio = sanitizarTexto(newReviewText); // Aplicamos el filtro

    const res = await apiService.crearResena(id, newReviewRating, textoLimpio);
    
    if (res.success) {
        setNewReviewText(''); setNewReviewRating(0); setShowSuccessModal(true); loadData(false); 
    } else setReviewMessage({ type: 'error', text: res.message || 'Error al publicar la reseña.' });
    setIsSubmitting(false);
  };

  // ✨ NUEVO: Función para eliminar reseña (Admin)
  const handleEliminarResena = async (idResena: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta reseña?")) return;
    const res = await apiService.eliminarResena(idResena); 
    if (res.success) loadData(false); // Refresca silenciosamente
    else alert("Error al eliminar.");
  };

  const renderStars = (rating: number) => { /* IGUAL QUE TU CÓDIGO ORIGINAL */ 
    return Array.from({ length: 5 }).map((_, i) => (
      <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-4 h-4 ${i < Math.round(rating) ? 'text-amber-400' : 'text-gray-300'}`}>
        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006z" clipRule="evenodd" />
      </svg>
    ));
  };

  if (loading) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500 font-medium">Cargando producto...</p>
      </div>
  );
  if (!product) return <div className="p-20 text-center">Producto no encontrado.</div>;

  return (
    <div className="bg-surface min-h-screen flex flex-col font-sans relative">
      <Header />
      
      <main className="grow max-w-1440px mx-auto w-full px-6 md:px-16 py-8">
        {/* NAVEGACIÓN Y BOTÓN ADMIN DE EDICIÓN RÁPIDA */}
        <div className="flex justify-between items-center mb-8">
            <nav className="flex items-center gap-2 text-sm text-gray-400">
            <Link to="/" className="hover:text-emerald-500">Inicio</Link> <span>/</span> <Link to="/catalogo" className="hover:text-emerald-500">Catálogo</Link> <span>/</span> <span className="text-slate-900 truncate">{product.nombre}</span>
            </nav>
            {isAdmin && (
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
                      {product.galeria.map((img, idx) => (
                          <button key={idx} onClick={() => setMainImage(img.imagen_url)} className={`w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${mainImage === img.imagen_url ? 'border-emerald-500 shadow-md' : 'border-transparent hover:border-gray-200'}`}>
                              <img src={img.imagen_url} alt="Vista" className="w-full h-full object-cover" />
                          </button>
                      ))}
                  </div>
              )}
          </div>

          {/* INFORMACIÓN */}
          <div className="flex flex-col">
            <span className="text-emerald-500 font-bold uppercase text-xs mb-2">{product.nombre_categoria || 'General'}</span>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">{product.nombre}</h1>
            
            {/* PRECIO Y STOCK DE INVENTARIOS */}
            <div className="flex items-center gap-6 mb-6">
              <span className="text-3xl font-black text-slate-900">${Number(product.precio_base).toFixed(2)}</span>
              {stockDisponible !== null && (
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${stockDisponible > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                      {stockDisponible > 0 ? `${stockDisponible} en stock` : 'Agotado'}
                  </span>
              )}
            </div>

            <p className="text-gray-500 text-lg mb-8">{product.descripcion}</p>

            {/* CARRITO */}
            <div className="space-y-6 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-6">
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 h-14">
                  <button onClick={() => setQuantity(q => Math.max(1, q-1))} className="px-5 h-full font-bold hover:bg-gray-200">-</button>
                  <span className="px-6 font-bold text-slate-900 w-12 text-center">{quantity}</span>
                  <button onClick={() => setQuantity(q => q+1)} className="px-5 h-full font-bold hover:bg-gray-200" disabled={stockDisponible === 0 || quantity >= (stockDisponible || 0)}>+</button>
                </div>
                <button disabled={stockDisponible === 0} className="flex-1 h-14 bg-slate-900 text-white rounded-2xl font-bold hover:bg-emerald-500 transition-all active:scale-95 disabled:bg-gray-300">
                  {stockDisponible === 0 ? 'Sin existencias' : 'Añadir al carrito'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <section className="mb-20">
          <div className="flex border-b border-gray-200 gap-8 mb-8">
            <button onClick={() => setActiveTab('descripcion')} className={`pb-4 font-bold ${activeTab === 'descripcion' ? 'border-b-2 border-emerald-500 text-slate-900' : 'text-gray-400'}`}>Especificaciones</button>
            <button onClick={() => setActiveTab('resenas')} className={`pb-4 font-bold ${activeTab === 'resenas' ? 'border-b-2 border-emerald-500 text-slate-900' : 'text-gray-400'}`}>Reseñas ({product.rating?.total || 0})</button>
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
                                    {isAdmin && (
                                        <div className="mt-4 pt-3 border-t border-red-50 flex justify-end">
                                            <button onClick={() => handleEliminarResena(resena.id_resena)} className="text-xs text-red-500 font-bold hover:underline">
                                                Eliminar Reseña (Admin)
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
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          {/* Animación fluida de escala y sombra sin sobrecargar el navegador */}
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transform transition-all scale-100 opacity-100">
            
            {/* Ícono de checkmark animado usando Tailwind básico */}
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
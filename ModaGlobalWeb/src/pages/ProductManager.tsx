import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // <-- IMPORTAMOS useParams
import { apiService } from '../services/ApiService';

const ProductManager: React.FC = () => {
    const { id } = useParams<{ id: string }>(); // Capturamos el ID de la URL
    const navigate = useNavigate();

  // Estados del formulario (inician vacíos)

    const [form, setForm] = useState({ 
        nombre: '', precio_base: '' as number | string, descripcion: '', sku: '', stock_inicial: '', id_categoria: ''
    });

    const [specs, setSpecs] = useState<{ clave: string, valor: string }[]>([{ clave: '', valor: '' }]);
    const [images, setImages] = useState<File[]>([]);
    const [mainImageIndex, setMainImageIndex] = useState<number>(0);
    const [categorias, setCategorias] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(!!id); // Si hay ID, empezamos cargando

  // 1. Cargar categorías Y datos del producto (si es edición)
    useEffect(() => {
        const loadInitialData = async () => {
            // Cargamos categorías siempre
            const resCats = await apiService.getCategorias();
            if (resCats.success && resCats.data) setCategorias(resCats.data);

            // Si hay un ID en la URL, significa que estamos EDITANDO
            if (id) {
                const resProd = await apiService.getProductoById(id);
                if (resProd.success && resProd.data) {
                    const p = resProd.data;
                    // Llenamos el formulario con los datos que llegaron de la BD
                    setForm({
                        nombre: p.nombre || '', precio_base: p.precio_base || '', descripcion: p.descripcion || '',
                        sku: p.sku || '', stock_inicial: '', id_categoria: p.id_categoria || ''
                    });

                    if (p.especificaciones && p.especificaciones.length > 0) {
                        setSpecs(p.especificaciones);
                    }
                } else {
                    alert("No se pudo cargar la información del producto.");
                    navigate('/catalogo'); // Lo regresamos si el ID es inválido
                }
                setIsLoadingData(false);
            }
        };

        loadInitialData();
    }, [id, navigate]);

    const handleAddSpec = () => setSpecs([...specs, { clave: '', valor: '' }]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const nuevasImagenes = Array.from(e.target.files);
            // ✨ En lugar de reemplazar, las SUMAMOS a las que ya estaban
            setImages(prev => [...prev, ...nuevasImagenes]);
        }
        // Limpiamos el valor del input para que te permita volver a seleccionar la misma si quieres
        e.target.value = '';
    };

    const handleRemoveImage = (indexToRemove: number) => {
        // Filtramos para quitar solo la imagen seleccionada
        setImages(prev => prev.filter((_, i) => i !== indexToRemove));
        
        // Ajustamos la estrella (mainImageIndex) para que no se rompa si borramos la foto principal
        if (mainImageIndex === indexToRemove) {
            setMainImageIndex(0); 
        } else if (mainImageIndex > indexToRemove) {
            setMainImageIndex(prev => prev - 1);
        }
    };

    const handleSaveAll = async () => {
        if (!form.nombre || !form.precio_base || !form.id_categoria) {
            alert("El nombre, precio y categoría son obligatorios.");
            return;
        }
        setIsSubmitting(true);
        try {
            // ✨ IMPORTANTE: Le inyectamos el índice principal al formulario
            const dataToSave = id ? { ...form, id_producto: id, mainImageIndex } : { ...form, mainImageIndex };
            const resData = await apiService.saveProductoCompleto(dataToSave, specs, images);

            if (resData.success) {
                alert(id ? "¡Producto actualizado con éxito!" : "¡Producto publicado con éxito!");
                navigate('/catalogo'); 
            } else throw new Error(resData.error || resData.message || 'Error desconocido del servidor');
        } catch (error: any) {
            alert("Hubo un error: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Pantalla de carga mientras trae los datos de edición
    if (isLoadingData) return (<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div></div>);

    return (
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-4xl mx-auto border border-gray-100 font-sans my-10">
        <h2 className="text-2xl font-black text-slate-900 mb-6">
            {id ? 'Editar Producto' : 'Crear Nuevo Producto'}
        </h2>
        
        {/* SECCIÓN 1: INFORMACIÓN PRINCIPAL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            
            {/* Fila 1 */}
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre del producto *</label>
                <input 
                    className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                    placeholder="Ej: Chamarra de Cuero Premium" 
                    value={form.nombre} 
                    onChange={e => setForm({...form, nombre: e.target.value})} 
                />
            </div>
            <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Precio Base *</label>
                <div className="relative">
                    <span className="absolute left-3 top-3.5 text-gray-400 font-bold">$</span>
                    <input 
                        className="w-full border border-gray-200 p-3 pl-8 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                        type="number" 
                        placeholder="0.00" 
                        value={form.precio_base}
                        onChange={e => setForm({...form, precio_base: e.target.value})} 
                    />
                </div>
            </div>

            {/* Fila 2 */}
            <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Categoría *</label>
                <select 
                    className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all bg-white"
                    value={form.id_categoria}
                    onChange={e => setForm({...form, id_categoria: e.target.value})}
                >
                    <option value="" disabled>Seleccione...</option>
                    {categorias.map(cat => (
                        <option key={cat.id_categoria} value={cat.id_categoria}>
                            {cat.nombre}
                        </option>
                    ))}
                </select>
            </div>
            <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">SKU</label>
                <input 
                    className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                    placeholder="Ej: 750-CHAM-01" 
                    value={form.sku} 
                    onChange={e => setForm({...form, sku: e.target.value})} 
                />
            </div>
            <div className="md:col-span-1">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Stock Inicial</label>
                <input 
                    className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400" 
                    type="number" 
                    placeholder="Ej: 50" 
                    value={form.stock_inicial}
                    disabled={!!id} // Deshabilitado si estamos editando
                    title={id ? "El stock se gestiona en Inventarios" : ""}
                    onChange={e => setForm({...form, stock_inicial: e.target.value})} 
                />
            </div>

            {/* Fila 3 */}
            <div className="md:col-span-3">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Descripción detallada</label>
                <textarea 
                    className="w-full border border-gray-200 p-3 rounded-xl resize-none h-24 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                    placeholder="Describe los materiales, diseño y beneficios..." 
                    value={form.descripcion}
                    onChange={e => setForm({...form, descripcion: e.target.value})} 
                />
            </div>
        </div>

        {/* SECCIÓN 2: ESPECIFICACIONES TÉCNICAS */}
        <div className="mb-8 p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
            <h3 className="font-bold text-slate-900 mb-4">Características Técnicas</h3>
            {specs.map((s: { clave: string, valor: string }, i: number) => (
            <div key={i} className="flex gap-4 mb-3">
                <input 
                    className="border border-gray-200 p-3 rounded-xl flex-1 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
                    placeholder="Ej: Material" 
                    value={s.clave}
                    onChange={e => {
                        const newSpecs = [...specs]; 
                        newSpecs[i].clave = e.target.value; 
                        setSpecs(newSpecs);
                    }} 
                />
                <input 
                    className="border border-gray-200 p-3 rounded-xl flex-1 outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
                    placeholder="Ej: Algodón" 
                    value={s.valor}
                    onChange={e => {
                        const newSpecs = [...specs]; 
                        newSpecs[i].valor = e.target.value; 
                        setSpecs(newSpecs);
                    }} 
                />
            </div>
            ))}
            <button onClick={handleAddSpec} className="text-emerald-500 text-sm font-bold hover:text-emerald-600 transition-colors mt-2">
                + Añadir otra característica
            </button>
        </div>

        {/* SECCIÓN 3: GALERÍA DE IMÁGENES PRO */}
        <div className="mb-8 p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
            <h3 className="font-bold text-slate-900 mb-2">Galería de Imágenes</h3>
            {id && <p className="text-xs text-amber-600 font-bold mb-4">Aviso: Las nuevas fotos reemplazarán a las anteriores en la base de datos.</p>}

            {/* Vista previa de las imágenes acumuladas */}
            {images.length > 0 && (
                <div className="mb-6">
                    <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">
                        Haz clic en la estrella para elegir la portada
                    </p>
                    <div className="flex flex-wrap gap-4">
                        {images.map((file, idx) => (
                            <div key={idx} className="relative w-28 h-28 rounded-xl overflow-hidden border-2 shrink-0 group shadow-sm bg-white">
                                <img src={URL.createObjectURL(file)} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                                
                                {/* Overlay de herramientas (Aparece al hacer hover) */}
                                <div className={`absolute inset-0 bg-slate-900/40 flex items-center justify-center gap-3 transition-opacity duration-300 ${mainImageIndex === idx ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    
                                    {/* Botón de Estrella (Principal) */}
                                    <button 
                                        type="button"
                                        onClick={() => setMainImageIndex(idx)}
                                        className={`p-1.5 rounded-full backdrop-blur-sm shadow-lg transform transition-transform ${mainImageIndex === idx ? 'bg-amber-400 text-white scale-110' : 'bg-white/80 text-slate-700 hover:text-amber-500 hover:scale-110'}`}
                                        title="Marcar como principal"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.006z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    
                                    {/* Botón de Eliminar (Basurero) */}
                                    <button 
                                        type="button"
                                        onClick={() => handleRemoveImage(idx)}
                                        className="p-1.5 rounded-full bg-white/80 backdrop-blur-sm text-red-500 shadow-lg hover:bg-red-500 hover:text-white transition-colors"
                                        title="Eliminar imagen"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                            <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clipRule="evenodd" />
                                        </svg>
                                    </button>

                                </div>
                                {/* Borde verde indicador de Principal */}
                                {mainImageIndex === idx && <div className="absolute inset-0 border-4 border-emerald-500 rounded-xl pointer-events-none"></div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Input oculto accionado por un label amigable */}
            <div>
                <label className="inline-flex items-center gap-2 text-emerald-500 text-sm font-bold hover:text-emerald-600 transition-colors mt-2 cursor-pointer bg-emerald-50 px-4 py-2 rounded-lg hover:bg-emerald-100">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>Añadir imágenes</span>
                    <input 
                        type="file" multiple accept="image/*" onChange={handleImageChange} 
                        className="hidden"
                    />
                </label>
            </div>
        </div>

        <button onClick={handleSaveAll} disabled={isSubmitting} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-lg active:scale-95 disabled:opacity-50">
            {isSubmitting ? 'Guardando...' : (id ? 'Actualizar Producto' : 'Guardar Producto')}
        </button>
    </div>
    );
};

export default ProductManager;
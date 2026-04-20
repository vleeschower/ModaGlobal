import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/dashboardLayout';
import { apiService } from '../services/ApiService';

const ProductManager: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Capturamos el ID de la URL
  const navigate = useNavigate();

  // Estados del formulario básico
  const [form, setForm] = useState({ 
      nombre: '', 
      precio_base: '' as number | string, 
      descripcion: '',
      sku: '',
      stock_inicial: '', 
      id_categoria: ''
  });
  
  const [specs, setSpecs] = useState<{ clave: string, valor: string }[]>([{ clave: '', valor: '' }]);
  const [categorias, setCategorias] = useState<any[]>([]);
  
  // Estados de control
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(!!id);

  // ==========================================================
  // ✨ NUEVOS ESTADOS PARA GESTIÓN DE GALERÍA
  // ==========================================================
  const [existingImages, setExistingImages] = useState<any[]>([]); 
  const [newImagesFiles, setNewImagesFiles] = useState<File[]>([]);
  const [mainImageId, setMainImageId] = useState<string | null>(null);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);

  // 1. Cargar categorías Y datos del producto
  useEffect(() => {
      const loadInitialData = async () => {
          // Cargar categorías
          const resCats = await apiService.getCategorias();
          if (resCats.success && resCats.data) setCategorias(resCats.data);

          // Si estamos EDITANDO
          if (id) {
              const resProd = await apiService.getProductoById(id);
              if (resProd.success && resProd.data) {
                  const p = resProd.data;
                  
                  // Llenar formulario de texto
                  setForm({
                      nombre: p.nombre || '',
                      precio_base: p.precio_base || '',
                      descripcion: p.descripcion || '',
                      sku: p.sku || '',
                      stock_inicial: '', 
                      id_categoria: p.id_categoria || ''
                  });

                  if (p.especificaciones && p.especificaciones.length > 0) {
                      setSpecs(p.especificaciones);
                  }

                  // --- Cargar galería existente ---
                  // Usamos un fallback por si id_imagen no viene en el JSON inicial
                  const loadedGallery = (p.galeria || []).map((img: any, index: number) => ({
                      ...img,
                      id_imagen: img.id_imagen || `fallback-${index}`
                  }));

                  setExistingImages(loadedGallery);

                  // Identificar la principal actual
                  const principal = loadedGallery.find((img: any) => img.es_principal);
                  setMainImageId(principal ? principal.id_imagen : (loadedGallery[0]?.id_imagen || null));

              } else {
                  alert("No se pudo cargar la información del producto.");
                  navigate('/dashboard/productos');
              }
          }
          setIsLoadingData(false);
      };

      loadInitialData();
  }, [id, navigate]);

  // ==========================================================
  // HANDLERS DEL FORMULARIO Y GALERÍA
  // ==========================================================
  
  const handleAddSpec = () => setSpecs([...specs, { clave: '', valor: '' }]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFilesArray = Array.from(e.target.files);
      // Añadimos los nuevos archivos sin borrar los que ya habíamos seleccionado
      setNewImagesFiles(prev => [...prev, ...newFilesArray]);
    }
  };

  const markExistingForDeletion = (id_imagen: string) => {
    if (id_imagen === mainImageId) {
        alert("No puedes eliminar la imagen principal. Selecciona otra como principal primero.");
        return;
    }
    setImagesToDelete(prev => [...prev, id_imagen]);
  };

  const removeNewFile = (index: number) => {
    setNewImagesFiles(prev => prev.filter((_, i) => i !== index));
  };

  const setAsMain = (id_imagen: string) => {
    setMainImageId(id_imagen);
  };

  // Función de guardado completo
  const handleSaveAll = async () => {
    if (!form.nombre || !form.precio_base || !form.id_categoria) {
        alert("El nombre, precio y categoría son obligatorios.");
        return;
    }

    setIsSubmitting(true);
    try {
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

        // 3. Lógica de Galería de Imágenes
        formData.append('mainImageId', mainImageId || '');
        formData.append('imagesToDelete', JSON.stringify(imagesToDelete));
        
        // Adjuntar archivos nuevos (Multer en tu backend espera el campo 'imagenes')
        newImagesFiles.forEach(file => {
            formData.append('imagenes', file);
        });

        // Enviamos todo al servicio
        const isEdit = !!id;
        // Le pasamos null o vacío si no hay id en vez del objeto completo para evitar conflictos con FormData
        const targetUrl = isEdit ? `/api/productos/${id}` : `/api/productos/nuevo`;
        const method = isEdit ? 'PUT' : 'POST';

        // Petición directa manual o mediante el ApiService actualizado
        const resData = await fetch(import.meta.env.VITE_API_GATEWAY_URL + targetUrl, {
            method: method,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('mg_token')}`
                // NO poner Content-Type, el navegador lo calcula para el FormData
            },
            body: formData
        }).then(res => res.json());

        if (resData.success) {
            alert(id ? "¡Producto actualizado con éxito!" : "¡Producto publicado con éxito!");
            navigate('/dashboard/productos'); 
        } else {
            throw new Error(resData.error || resData.message || 'Error desconocido del servidor');
        }
    } catch (error: any) {
        alert("Hubo un error: " + error.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  // Pantalla de carga
  if (isLoadingData) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 font-bold">Cargando datos del producto...</p>
          </div>
      );
  }

  return (
    <DashboardLayout>
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-4xl mx-auto border border-gray-100 font-sans my-10">
        <h2 className="text-2xl font-black text-slate-900 mb-6">
          {id ? 'Editar Producto' : 'Crear Nuevo Producto'}
        </h2>
        
        {/* SECCIÓN 1: INFORMACIÓN PRINCIPAL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
          
          {/* Ajuste Omnicanal sugerido para Stock Inicial */}
          <div className="md:col-span-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Stock Bodega Central</label>
              <input 
                  className="w-full border border-gray-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-400" 
                  type="number" 
                  placeholder="Ej: 500" 
                  value={form.stock_inicial}
                  disabled={!!id} 
                  title={id ? "El stock se gestiona desde el módulo de Inventarios" : "Inventario inicial destinado al almacén principal"}
                  onChange={e => setForm({...form, stock_inicial: e.target.value})} 
              />
          </div>

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

        {/* ========================================================== */}
        {/* SECCIÓN 3: UI MEJORADA DE GESTIÓN DE GALERÍA               */}
        {/* ========================================================== */}
        <div className="mb-8 p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
          <h3 className="font-bold text-slate-900 mb-4">Galería de Imágenes</h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            
            {/* Mostrar Imágenes Existentes (Servidor) */}
            {existingImages
              .filter(img => !imagesToDelete.includes(img.id_imagen)) 
              .map((img) => (
              <div key={img.id_imagen} className={`relative group border-2 rounded-xl overflow-hidden ${mainImageId === img.id_imagen ? 'border-emerald-500 shadow-md' : 'border-gray-200'}`}>
                <img src={img.imagen_url} alt="Producto" className="w-full h-32 object-cover bg-white" />
                
                {/* Controles flotantes sobre la imagen */}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <div className="flex justify-end">
                      {mainImageId !== img.id_imagen && (
                          <button type="button" onClick={() => markExistingForDeletion(img.id_imagen)} className="w-8 h-8 flex items-center justify-center bg-white/20 text-white rounded-full hover:bg-red-500 backdrop-blur-sm transition-colors" title="Eliminar imagen">
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                      )}
                  </div>
                  <button type="button" onClick={() => setAsMain(img.id_imagen)} className={`w-full text-xs py-1.5 rounded-lg font-bold transition-colors ${mainImageId === img.id_imagen ? 'bg-emerald-500 text-white' : 'bg-white text-slate-900 hover:bg-emerald-50 shadow-sm'}`}>
                      {mainImageId === img.id_imagen ? 'Principal' : 'Fijar Principal'}
                  </button>
                </div>
              </div>
            ))}

            {/* Mostrar Archivos Nuevos (Locales) */}
            {newImagesFiles.map((file, index) => (
              <div key={index} className="relative group border-2 border-emerald-200 border-dashed rounded-xl overflow-hidden bg-emerald-50/30">
                <img src={URL.createObjectURL(file)} alt="Nueva" className="w-full h-32 object-cover opacity-90" />
                
                {/* Controles flotantes */}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between p-2 items-start">
                   <span className="text-[9px] bg-emerald-500 text-white px-2 py-1 rounded-md font-bold tracking-widest shadow-sm">NUEVA</span>
                   <button type="button" onClick={() => removeNewFile(index)} className="w-8 h-8 flex items-center justify-center bg-white/20 text-white rounded-full hover:bg-red-500 backdrop-blur-sm transition-colors" title="Quitar archivo">
                      <span className="material-symbols-outlined text-[18px]">close</span>
                   </button>
                </div>
              </div>
            ))}

            {/* Botón para Añadir Más */}
            <label className="relative flex flex-col items-center justify-center h-32 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-gray-50 hover:border-emerald-400 transition-all text-gray-400 hover:text-emerald-500 group">
              <span className="material-symbols-outlined text-3xl mb-1 transition-transform group-hover:scale-110">add_photo_alternate</span>
              <span className="text-xs font-bold">Subir foto</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>

          </div>
          <p className="text-[11px] text-gray-400 mt-4 leading-relaxed max-w-2xl">
              * La primera imagen guardada se establecerá como portada si no seleccionas una manualmente. Puedes subir fotos adicionales arrastrando o haciendo clic en el botón superior.
          </p>
        </div>

        <button 
          onClick={handleSaveAll} 
          disabled={isSubmitting}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
        >
          {isSubmitting ? 'Procesando...' : (id ? 'Guardar Cambios' : 'Publicar Producto en Catálogo')}
        </button>
      </div>
    </DashboardLayout>
  );
};

export default ProductManager;
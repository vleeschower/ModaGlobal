import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // <-- IMPORTAMOS useParams
import { apiService } from '../services/ApiService';

const ProductManager: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Capturamos el ID de la URL
  const navigate = useNavigate();

  // Estados del formulario (inician vacíos)
  const [form, setForm] = useState({ 
      nombre: '', 
      precio_base: '' as number | string, 
      descripcion: '',
      sku: '',
      stock_inicial: '', 
      id_categoria: ''
  });
  
  const [specs, setSpecs] = useState<{ clave: string, valor: string }[]>([{ clave: '', valor: '' }]);
  const [images, setImages] = useState<File[]>([]);
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
                      nombre: p.nombre || '',
                      precio_base: p.precio_base || '',
                      descripcion: p.descripcion || '',
                      sku: p.sku || '',
                      stock_inicial: '', // El stock no se edita aquí
                      id_categoria: p.id_categoria || ''
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
      setImages(Array.from(e.target.files));
    }
  };
  
  const handleSaveAll = async () => {
    if (!form.nombre || !form.precio_base || !form.id_categoria) {
        alert("El nombre, precio y categoría son obligatorios.");
        return;
    }

    setIsSubmitting(true);
    try {
        // Le pasamos el ID al form si estamos editando para que el servicio haga un PUT
        const dataToSave = id ? { ...form, id_producto: id } : form;
        
        const resData = await apiService.saveProductoCompleto(dataToSave, specs, images);

        if (resData.success) {
            alert(id ? "¡Producto actualizado con éxito!" : "¡Producto publicado con éxito!");
            navigate('/catalogo'); // Redirigimos al catálogo al terminar
        } else {
            throw new Error(resData.error || resData.message || 'Error desconocido del servidor');
        }
    } catch (error: any) {
        alert("Hubo un error: " + error.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  // Pantalla de carga mientras trae los datos de edición
  if (isLoadingData) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 font-bold">Cargando datos del producto...</p>
          </div>
      );
  }

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

      {/* SECCIÓN 3: GALERÍA DE IMÁGENES */}
      <div className="mb-8 p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
        <h3 className="font-bold text-slate-900 mb-2">Galería de Imágenes</h3>
        {id && <p className="text-xs text-amber-600 font-bold mb-4">Aviso: Subir nuevas fotos reemplazará las anteriores.</p>}
        <input 
            type="file" 
            multiple 
            accept="image/*" 
            onChange={handleImageChange} 
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-emerald-50 file:text-emerald-600 hover:file:bg-emerald-100 transition-all cursor-pointer"
        />
        {images.length > 0 && (
            <div className="mt-4 flex gap-2 overflow-x-auto">
                {images.map((file, idx) => (
                    <div key={idx} className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                        <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                    </div>
                ))}
            </div>
        )}
      </div>

      <button 
        onClick={handleSaveAll} 
        disabled={isSubmitting}
        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-emerald-500 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Guardando...' : (id ? 'Actualizar Producto' : 'Guardar Producto')}
      </button>
    </div>
  );
};

export default ProductManager;
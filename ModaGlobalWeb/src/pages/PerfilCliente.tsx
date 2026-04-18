import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Header from '../components/header';
import Footer from '../components/footer';
import { userService } from '../services/UserService';

const Profile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('perfil');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: ''
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (user.rol !== 'Cliente') {
      navigate('/dashboard/*');
    } else {
      setFormData({
        nombre: user.nombre || '',
        email: user.email || '',
        telefono: user.telefono || ''
      });
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);

    // Toda la validación y lógica está en userService.updateProfile()
    const response = await userService.updateProfile(user!.id, {
      nombre: formData.nombre,
      email: formData.email,
      telefono: formData.telefono
    });

    setLoading(false);

    if (response.success) {
      // Actualizar el usuario en el contexto
      const updatedUser = {
        ...user!,
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono
      };
      updateUser(updatedUser);

      Swal.fire({
        icon: 'success',
        title: '¡Perfil actualizado!',
        text: 'Tus datos han sido actualizados correctamente',
        confirmButtonColor: '#002727',
        confirmButtonText: 'Entendido'
      });
      setIsEditing(false);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: response.message || 'No se pudieron actualizar los datos',
        confirmButtonColor: '#002727'
      });
    }
  };

  if (!user || user.rol !== 'Cliente') return null;

  const pedidos = [
    {
      id: 'MG-98234',
      producto: 'Zapatillas Performance X-200',
      fecha: '24 Feb, 2026',
      total: 1290.00,
      tienda: 'ModaGlobal, Tuxtla',
      estado: 'Listo para recoger',
      img: 'https://cdn.runrepeat.com/storage/gallery/buying_guide_primary/20/1-best-tennis-shoes-15275040-main.jpg'
    },
    {
      id: 'MG-98112',
      producto: 'Reloj Chronos Minimalist Ed.',
      fecha: '15 Ene, 2026',
      total: 890.00,
      tienda: 'ModaGlobal, Tuxtla',
      estado: 'Entregado',
      img: 'https://i.ebayimg.com/images/g/eHkAAeSw2zppgOqq/s-l1200.webp'
    }
  ];

  const menuItems = [
    { id: 'perfil', icon: 'person_outline', label: 'Mi perfil' },
    { id: 'pedidos', icon: 'shopping_bag', label: 'Mis pedidos' },
    { id: 'direcciones', icon: 'location_on', label: 'Direcciones' },
    { id: 'pagos', icon: 'credit_card', label: 'Métodos de pago' },
  ];

  return (
    <div className="bg-[#F8F9FA] min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow">
        {/* Hero Section del Perfil */}
        <section className="relative w-full bg-gradient-to-r from-primary to-primary-esmeralda overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="w-full h-full bg-gradient-to-r from-primary to-primary-esmeralda"></div>
          </div>
          <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 md:px-16 py-4 md:py-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-3">
              <div className="text-center md:text-left">
                <div className="flex items-center gap-3 justify-center md:justify-start">
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-2xl md:text-3xl">person</span>
                  </div>
                  <div>
                    <h1 className="text-xl md:text-3xl font-bold text-white">{user.nombre}</h1>
                    <p className="text-white/60 text-xs md:text-sm">Cliente ModaGlobal</p>
                  </div>
                </div>
              </div>
              {!isEditing ? (
                <button 
                  onClick={() => { setActiveTab('perfil'); setIsEditing(true); }}
                  className="bg-primary hover:bg-secondary text-white px-3 py-1 md:px-4 md:py-1.5 rounded-xl font-semibold text-xs md:text-sm transition-all flex items-center gap-1"
                  disabled={loading}
                >
                  <span className="material-symbols-outlined text-base md:text-lg">edit</span>
                  Editar Perfil
                </button>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsEditing(false)} 
                    className=" hover:bg-red-500 text-white px-3 py-1 md:px-4 md:py-1.5 rounded-xl border border-gray-300 text-xs md:text-sm font-semibold transition-all"
                  
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSave} 
                    className="bg-primary text-white px-3 py-1 md:px-4 md:py-1.5 rounded-xl text-xs md:text-sm font-semibold hover:bg-secondary transition-all shadow-md"
                    disabled={loading}
                  >
                    {loading ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Contenido Principal */}
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-16 py-6 md:py-8">
          {/* Menú Horizontal Scroll (visible en móvil y tablet) */}
          <div className="lg:hidden mb-6">
            <div 
              ref={scrollContainerRef}
              className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setIsEditing(false); }}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                    activeTab === item.id 
                      ? 'bg-primary text-white shadow-md' 
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  <span className="text-base font-medium whitespace-nowrap">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Sidebar - Menú lateral (visible solo en desktop) */}
            <aside className="hidden lg:block lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
                <nav className="p-3 space-y-0.5">
                  <button
                    onClick={() => { setActiveTab('perfil'); setIsEditing(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      activeTab === 'perfil' 
                        ? 'bg-primary/10 text-primary font-semibold' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl">person_outline</span>
                    <span className="text-base">Mi perfil</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('pedidos')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      activeTab === 'pedidos' 
                        ? 'bg-primary/10 text-primary font-semibold' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl">shopping_bag</span>
                    <span className="text-base">Mis pedidos</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('direcciones')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      activeTab === 'direcciones' 
                        ? 'bg-primary/10 text-primary font-semibold' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl">location_on</span>
                    <span className="text-base">Direcciones</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('pagos')}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      activeTab === 'pagos' 
                        ? 'bg-primary/10 text-primary font-semibold' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl">credit_card</span>
                    <span className="text-base">Métodos de pago</span>
                  </button>
                </nav>
              </div>
            </aside>

            {/* Contenido Principal */}
            <div className="lg:col-span-3">
              
              {/* Mi Perfil */}
              {activeTab === 'perfil' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-5 md:p-6 border-b border-gray-100">
                    <h2 className="text-xl md:text-2xl font-bold text-primary">Información personal</h2>
                    <p className="text-gray-500 text-sm mt-0.5">Gestiona los datos de tu cuenta</p>
                  </div>
                  
                  <div className="p-5 md:p-6 space-y-4">
                    {/* Nombre completo */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          NOMBRE COMPLETO
                        </label>
                      </div>
                      <div className="md:col-span-2">
                        {isEditing ? (
                          <input
                            type="text"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            disabled={loading}
                          />
                        ) : (
                          <p className="text-gray-800 font-medium text-base">{user.nombre}</p>
                        )}
                      </div>
                    </div>

                    {/* Correo electrónico */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          CORREO ELECTRÓNICO
                        </label>
                      </div>
                      <div className="md:col-span-2">
                        {isEditing ? (
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            disabled={loading}
                          />
                        ) : (
                          <p className="text-gray-800 text-base">{user.email}</p>
                        )}
                      </div>
                    </div>

                    {/* Teléfono */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          TELÉFONO
                        </label>
                      </div>
                      <div className="md:col-span-2">
                        {isEditing ? (
                          <input
                            type="tel"
                            name="telefono"
                            value={formData.telefono || ''}
                            onChange={handleChange}
                            placeholder="No especificado"
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                            disabled={loading}
                          />
                        ) : (
                          <p className="text-gray-800 text-base">{user.telefono || 'No especificado'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Mis Pedidos */}
              {activeTab === 'pedidos' && (
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-5 md:p-6 border-b border-gray-100">
                      <h2 className="text-xl md:text-2xl font-bold text-primary">Pedidos recientes</h2>
                      <p className="text-gray-500 text-sm mt-0.5">Historial de tus compras</p>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {pedidos.map((pedido) => (
                        <div key={pedido.id} className="p-5 md:p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex flex-col md:flex-row gap-5">
                            {/* Imagen del producto */}
                            <div className="w-full md:w-28 h-28 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                              <img 
                                src={pedido.img} 
                                alt={pedido.producto}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            
                            {/* Información del pedido */}
                            <div className="flex-grow">
                              <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                                <div>
                                  <p className="text-xs text-gray-400 mb-0.5">Pedido #{pedido.id}</p>
                                  <h3 className="text-lg font-bold text-primary">{pedido.producto}</h3>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                  pedido.estado === 'Entregado' 
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {pedido.estado}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-3">
                                <div>
                                  <p className="text-gray-400 text-xs">FECHA</p>
                                  <p className="font-medium text-base">{pedido.fecha}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 text-xs">TOTAL</p>
                                  <p className="font-medium text-primary-esmeralda font-bold text-base">${pedido.total.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 text-xs">RECOGIDA EN</p>
                                  <p className="font-medium text-base">{pedido.tienda}</p>
                                </div>
                              </div>
                              
                              <div className="flex gap-3">
                                <button className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-primary-esmeralda transition-colors">
                                  Ver detalles
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Direcciones - Placeholder */}
              {activeTab === 'direcciones' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-8 text-center">
                    <span className="material-symbols-outlined text-6xl text-gray-300 mb-3">location_on</span>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Próximamente</h3>
                    <p className="text-gray-500 text-base">La sección de direcciones estará disponible pronto</p>
                  </div>
                </div>
              )}

              {/* Métodos de Pago - Placeholder */}
              {activeTab === 'pagos' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-8 text-center">
                    <span className="material-symbols-outlined text-6xl text-gray-300 mb-3">credit_card</span>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Próximamente</h3>
                    <p className="text-gray-500 text-base">La sección de métodos de pago estará disponible pronto</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
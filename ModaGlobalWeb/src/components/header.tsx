import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; 
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/ApiService';
import Swal from 'sweetalert2';
import logoImg from '../assets/logom.png';
import { useCart } from '../context/CartContext'; // <-- Lógica del carrito de Rogelio

interface HeaderProps {
  toggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // <-- Sacamos el total de items del carrito (De Rogelio)
  const { totalItems } = useCart(); 

  // ✨ NUEVO ESTADO: Controla el menú desplegable de sucursales (Tuyo)
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [tiendas, setTiendas] = useState<any[]>([]);
  const [tiendaActual, setTiendaActual] = useState(localStorage.getItem('mg_tienda_seleccionada') || 'tnd-matriz');

  const navLinks = [
    { name: 'Catálogo', href: '/catalogo' },
    { name: 'Tecnología', href: '#' },
    { name: 'Accesorios', href: '#' },
    { name: 'Ofertas', href: '#' },
  ];

  // ✨ CARGAMOS LAS TIENDAS AL MONTAR EL HEADER
  useEffect(() => {
    const fetchTiendas = async () => {
      const res = await apiService.getTiendasPublicas();
      if (res.success && res.data) {
        setTiendas(res.data);
      }
    };
    fetchTiendas();
  }, []);

  // ✨ FUNCIÓN ACTUALIZADA: Ahora recibe un string directamente
  const handleCambioTienda = (idTienda: string) => {
    localStorage.setItem('mg_tienda_seleccionada', idTienda);
    setTiendaActual(idTienda);
    window.location.reload(); 
  };

  // Buscamos el nombre de la tienda actual para mostrarlo en el botón
  const tiendaSeleccionadaObj = tiendas.find(t => t.id_tienda === tiendaActual);
  const nombreTiendaActual = tiendaSeleccionadaObj ? tiendaSeleccionadaObj.nombre : 'Sede Matriz';

  const handleLogout = () => {
    Swal.fire({
      title: '¿Cerrar sesión?',
      text: '¿Estás seguro de que quieres cerrar sesión?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#002727',
      cancelButtonColor: '#dc2626',
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
        setIsOpen(false);
        setIsProfileOpen(false);
        navigate('/');
      }
    });
  };

  const handleProfileClick = () => {
    if (user?.rol === 'Cliente') navigate('/perfil');
    else if (user) navigate('/dashboard');
    setIsProfileOpen(false);
  };

  return (
    <nav className="sticky top-0 w-full z-50 shadow-lg shadow-primary/20 bg-primary">
      <div className="flex justify-between items-center px-4 md:px-8 py-3 max-w-1440px mx-auto gap-2 md:gap-6">
        
        {/* LOGO */}
        <div className="flex items-center shrink-0">
          <Link to="/" className="flex items-center gap-2 md:gap-3 flex-nowrap"> 
            <img src={logoImg} alt="ModaGlobal Logo" className="h-9 md:h-12 w-auto object-contain shrink-0" />
            <span className="font-headline font-bold text-lg md:text-2xl text-white tracking-tight whitespace-nowrap">
              ModaGlobal
            </span>
          </Link>
        </div>

        {/* NAVEGACIÓN DESKTOP (Integrado lo de Rogelio con Link) */}
        <div className="hidden lg:flex items-center gap-6 font-headline text-sm tracking-wide">
          {navLinks.map((link) => (
            <Link 
              key={link.name}
              className="text-gray-300 hover:text-primary-esmeralda transition-colors whitespace-nowrap" 
              to={link.href}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* ✨ ZONA CENTRAL: SELECTOR DE TIENDA Y BUSCADOR MÁS PEQUEÑO (Tuyo) */}
        <div className="hidden md:flex flex-1 items-center justify-end gap-3 max-w-2xl">
          
          {/* Selector Omnicanal Customizado */}
          <div className="relative">
            <button
              onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
              className="flex items-center bg-white/10 rounded-full px-4 py-2 border border-white/5 shrink-0 transition-colors hover:bg-white/20 focus:outline-none"
            >
              <span className="material-symbols-outlined text-primary-esmeralda text-[18px] mr-2">storefront</span>
              <span className="text-white text-sm font-medium pr-2 whitespace-nowrap">{nombreTiendaActual}</span>
              <span className={`material-symbols-outlined text-gray-400 text-[18px] transition-transform duration-300 ${isStoreDropdownOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {/* El Menú Desplegable */}
            {isStoreDropdownOpen && (
              <>
                {/* Overlay invisible para cerrar el menú si haces clic afuera */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsStoreDropdownOpen(false)}
                ></div>

                <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 rounded-2xl shadow-xl py-2 z-50 border border-white/10 overflow-hidden backdrop-blur-md">
                  <div className="px-4 py-2 mb-1 border-b border-white/10">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Elige tu sucursal</p>
                  </div>
                  
                  {tiendas.length === 0 && (
                    <button className="w-full text-left px-4 py-3 text-sm text-emerald-400 bg-emerald-500/10 font-bold">
                      Sede Matriz
                    </button>
                  )}

                  {tiendas.map(t => (
                    <button
                      key={t.id_tienda}
                      onClick={() => {
                        handleCambioTienda(t.id_tienda);
                        setIsStoreDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between ${
                        tiendaActual === t.id_tienda 
                          ? 'bg-emerald-500/10 text-emerald-400 font-bold border-l-2 border-emerald-500' 
                          : 'text-gray-300 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
                      }`}
                    >
                      {t.nombre}
                      {tiendaActual === t.id_tienda && (
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Buscador Compacto */}
          <div className="relative group w-full max-w-200px xl:max-w-260px">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-white transition-colors text-[20px]">
              search
            </span>
            <input 
              className="w-full bg-white/10 border-none rounded-full py-2 pl-10 pr-4 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary-esmeralda focus:bg-white/20 transition-all text-sm outline-none" 
              placeholder="Buscar..." 
              type="text" 
            />
          </div>
        </div>

        {/* ACCIONES (CARRITO Y PERFIL) */}
        <div className="flex items-center gap-1 md:gap-4 text-white shrink-0">
          
          {/* BOTÓN DEL CARRITO CON NOTIFICACIÓN (De Rogelio) */}
          <Link 
            to="/carrito" 
            className="p-2 hover:bg-white/10 hover:text-primary-esmeralda rounded-full transition-all active:scale-90 relative flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-2xl">shopping_cart</span>
            {totalItems > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-sm">
                {totalItems}
              </span>
            )}
          </Link>

          {/* PERFIL / LOGIN */}
          <div className="relative">
            {isAuthenticated ? (
              <>
                <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="p-2 hover:bg-white/10 hover:text-primary-esmeralda rounded-full transition-all active:scale-90 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">person</span>
                </button>

                {/* Dropdown del perfil */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-100">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-800">{user?.nombre}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <button onClick={handleProfileClick} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">account_circle</span>
                      {user?.rol === 'Cliente' ? 'Mi Perfil' : 'Dashboard'}
                    </button>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">logout</span> Cerrar sesión
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link to="/login" className="p-2 hover:bg-white/10 hover:text-primary-esmeralda rounded-full transition-all active:scale-90 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">person</span>
              </Link>
            )}
          </div>

          {/* MENÚ HAMBURGUESA */}
          <button onClick={() => setIsOpen(!isOpen)} className="p-2 hover:bg-white/10 rounded-full lg:hidden transition-colors">
            <span className="material-symbols-outlined text-2xl">{isOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* MENÚ MÓVIL (Con Selector de Tienda incluido) */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out bg-primary ${isOpen ? 'max-h-800px border-t border-white/10' : 'max-h-0'}`}>
        <div className="flex flex-col p-6 gap-6">
          
          {/* Selector de Tienda Móvil Customizado (Tuyo) */}
          <div className="md:hidden relative z-50">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Tu Sucursal</p>
            
            <button
              onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
              className="w-full flex items-center justify-between bg-white/10 rounded-xl px-4 py-3 border border-white/10 transition-colors hover:bg-white/20 focus:outline-none"
            >
              <div className="flex items-center">
                <span className="material-symbols-outlined text-primary-esmeralda text-[20px] mr-3">storefront</span>
                <span className="text-white font-medium">{nombreTiendaActual}</span>
              </div>
              <span className={`material-symbols-outlined text-gray-400 transition-transform duration-300 ${isStoreDropdownOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {isStoreDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-full bg-slate-800 rounded-xl shadow-xl py-2 border border-white/10 overflow-hidden">
                {tiendas.map(t => (
                  <button
                    key={t.id_tienda}
                    onClick={() => {
                      handleCambioTienda(t.id_tienda);
                      setIsStoreDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between ${
                      tiendaActual === t.id_tienda 
                        ? 'bg-emerald-500/20 text-emerald-400 font-bold border-l-4 border-emerald-500' 
                        : 'text-gray-300 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
                    }`}
                  >
                    {t.nombre}
                    {tiendaActual === t.id_tienda && <span className="material-symbols-outlined text-[18px]">check</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Buscador Móvil (Tuyo / Rogelio) */}
          <div className="md:hidden relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input 
              className="w-full bg-white/10 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-400 text-sm outline-none focus:border-primary-esmeralda transition-colors" 
              placeholder="¿Qué estás buscando?" 
              type="text" 
            />
          </div>

          <div className="flex flex-col gap-4 mt-2">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                to={link.href} 
                onClick={() => setIsOpen(false)} 
                className="text-gray-300 text-lg font-medium hover:text-primary-esmeralda transition-colors py-2 border-b border-white/5"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; 
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import logoImg from '../assets/logom.png';
import { useCart } from '../context/CartContext'; // <-- Lógica del carrito

interface HeaderProps {
  toggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { totalItems } = useCart(); // <-- Sacamos el total de items del carrito

  const navLinks = [
    { name: 'Ropa', href: '/catalogo' }, // Actualicé a /catalogo para que no sea un link muerto #
    { name: 'Tecnología', href: '/catalogo' },
    { name: 'Accesorios', href: '/catalogo' },
    { name: 'Ofertas', href: '/home' },
  ];

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
    if (user?.rol === 'Cliente') {
      navigate('/perfil');
    } else if (user) {
      navigate('/dashboard');
    }
    setIsProfileOpen(false);
  };

  return (
    <nav className="sticky top-0 w-full z-50 shadow-lg shadow-primary/20 bg-primary">
      <div className="flex justify-between items-center px-4 md:px-8 py-3 max-w-[1440px] mx-auto gap-2 md:gap-8">
        
        {/* LOGO */}
        <div className="flex items-center shrink-0">
          <Link to="/" className="flex items-center gap-2 md:gap-3 flex-nowrap"> 
            <img 
              src={logoImg} 
              alt="ModaGlobal Logo" 
              className="h-9 md:h-12 w-auto object-contain shrink-0" 
            />
            <span className="font-headline font-bold text-lg md:text-2xl text-white tracking-tight whitespace-nowrap">
              ModaGlobal
            </span>
          </Link>
        </div>

        {/* NAVEGACIÓN DESKTOP */}
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

        {/* BARRA DE BÚSQUEDA */}
        <div className="flex-1 max-w-xl hidden md:block">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-white transition-colors">
              search
            </span>
            <input 
              className="w-full bg-white/10 border-none rounded-full py-2 pl-10 pr-4 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary-esmeralda focus:bg-white/20 transition-all text-sm outline-none" 
              placeholder="Buscar productos..." 
              type="text" 
            />
          </div>
        </div>

        {/* ACCIONES (CARRITO Y PERFIL) */}
        <div className="flex items-center gap-1 md:gap-4 text-white shrink-0">
          
          {/* BOTÓN DEL CARRITO (CON LINK Y CONTADOR REAL) */}
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
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="p-2 hover:bg-white/10 hover:text-primary-esmeralda rounded-full transition-all active:scale-90 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-2xl">person</span>
                </button>

                {/* Dropdown del perfil */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-100">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-800">{user?.nombre}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleProfileClick}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">account_circle</span>
                      {user?.rol === 'Cliente' ? 'Mi Perfil' : 'Dashboard'}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg">logout</span>
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link 
                to="/login"
                className="p-2 hover:bg-white/10 hover:text-primary-esmeralda rounded-full transition-all active:scale-90 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-2xl">person</span>
              </Link>
            )}
          </div>

          {/* BOTÓN HAMBURGUESA (solo móvil) */}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 hover:bg-white/10 rounded-full lg:hidden transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">
              {isOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* MENÚ MÓVIL */}
      <div className={`
        lg:hidden overflow-hidden transition-all duration-300 ease-in-out bg-primary
        ${isOpen ? 'max-h-[600px] border-t border-white/10' : 'max-h-0'}
      `}>
        <div className="flex flex-col p-6 gap-6">
          <div className="md:hidden relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
            <input 
              className="w-full bg-white/10 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-gray-400 text-sm outline-none focus:border-primary-esmeralda transition-colors" 
              placeholder="¿Qué estás buscando?" 
              type="text" 
            />
          </div>

          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link 
                key={link.name}
                to={link.href}
                className="text-gray-300 text-lg font-medium hover:text-primary-esmeralda transition-colors py-2 border-b border-white/5"
                onClick={() => setIsOpen(false)}
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
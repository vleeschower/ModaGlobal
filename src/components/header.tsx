import React, { useState } from 'react';
import { Link } from 'react-router-dom'; 
import logoImg from '../assets/logom.png';

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navLinks = [
    { name: 'Ropa', href: '#' },
    { name: 'Tecnología', href: '#' },
    { name: 'Accesorios', href: '#' },
    { name: 'Ofertas', href: '#' },
  ];

  return (
    <nav className="sticky top-0 w-full z-50 shadow-xl shadow-emerald-950/20 bg-primary">
      <div className="flex justify-between items-center px-4 md:px-8 py-3 max-w-[1440px] mx-auto gap-2 md:gap-8">
        
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

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-6 font-headline text-sm tracking-wide">
          {navLinks.map((link) => (
            <a 
              key={link.name}
              className="text-slate-200/80 hover:text-white transition-colors whitespace-nowrap" 
              href={link.href}
            >
              {link.name}
            </a>
          ))}
        </div>

        <div className="flex-1 max-w-xl hidden md:block">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/80 group-focus-within:text-white transition-colors">
              search
            </span>
            <input 
              className="w-full bg-white/20 border-none rounded-full py-2 pl-10 pr-4 text-white placeholder:text-white/70 focus:ring-2 focus:ring-white/40 focus:bg-white/30 transition-all text-sm outline-none" 
              placeholder="Buscar productos..." 
              type="text" 
            />
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-4 text-white shrink-0">
          
          <button className="p-2 hover:bg-white/10 rounded-full transition-transform active:scale-90 relative">
            <span className="material-symbols-outlined text-2xl">shopping_cart</span>
          </button>

          <Link 
            to="/login" 
            className="p-2 hover:bg-white/10 rounded-full transition-transform active:scale-90 flex items-center justify-center"
            title="Iniciar sesión"
          >
            <span className="material-symbols-outlined text-2xl">person</span>
          </Link>

          {/* BOTÓN HAMBURGUESA */}
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
        lg:hidden overflow-hidden transition-all duration-300 ease-in-out bg-emerald-950
        ${isOpen ? 'max-h-[500px] border-t border-white/10' : 'max-h-0'}
      `}>
        <div className="flex flex-col p-6 gap-6">
          
          {/* Barra de búsqueda móvil */}
          <div className="md:hidden relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
              search
            </span>
            <input 
              className="w-full bg-white/10 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/50 text-sm outline-none" 
              placeholder="¿Qué estás buscando?" 
              type="text" 
            />
          </div>

          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a 
                key={link.name}
                href={link.href}
                className="text-slate-200 text-2lg font-medium hover:text-white transition-colors py-2 border-b border-white/5"
                onClick={() => setIsOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <Link 
              to="/login"
              className="text-primary-esmeralda text-2lg font-bold py-2"
              onClick={() => setIsOpen(false)}
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
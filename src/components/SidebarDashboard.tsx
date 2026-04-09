import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  
  const menuItems = [
    { name: 'Inicio', icon: 'home', path: '#' },
    { name: 'Usuarios', icon: 'group', path: '/dashboard/users' },
    { name: 'Tiendas', icon: 'store', path: '#' },
    { name: 'Productos', icon: 'inventory_2', path: '#' },
    { name: 'Pedidos', icon: 'shopping_cart', path: '#' },
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[55] lg:hidden backdrop-blur-sm transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      <aside className={`
        fixed left-0 top-0 bottom-0 z-[60] flex flex-col py-8 bg-primary shadow-2xl transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64 px-6 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-20 lg:px-3'}
        overflow-y-auto overflow-x-hidden
      `}>
        {/* Header del Sidebar */}
        <div className={`mb-12 flex items-center ${isOpen ? 'justify-between px-2' : 'justify-center'}`}>
          <div className={`${!isOpen && 'hidden'}`}>
            <h1 className="text-2xl font-headline font-bold text-white leading-none">ModaGlobal</h1>
          </div>
          {!isOpen && (
            <span className="hidden lg:block text-white font-bold text-xl tracking-tighter">MG</span>
          )}
        </div>

        {/* Navegación */}
        <nav className="flex-1 flex flex-col gap-3">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`
                  flex items-center rounded-xl transition-all duration-200 group relative
                  ${isOpen ? 'px-4 py-3 gap-4' : 'justify-center py-3 w-full'}
                  ${isActive 
                    ? 'bg-white/10 text-white font-bold shadow-lg' 
                    : 'text-slate-300 hover:text-white hover:bg-white/5'}
                `}
                title={!isOpen ? item.name : ''}
              >
                <span className={`
                  material-symbols-outlined transition-colors
                  ${isActive ? 'text-primary-esmeralda' : 'text-slate-400 group-hover:text-white'}
                  ${!isOpen ? 'text-2xl' : 'text-xl'}
                `}>
                  {item.icon}
                </span>
                
                {isOpen && (
                  <span className="font-label text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer del Sidebar */}
        <div className="mt-auto pt-6 border-t border-white/10">
          <Link 
            to="/" 
            className={`
              flex items-center text-slate-300 hover:text-white transition-all rounded-xl
              ${isOpen ? 'px-4 py-3 gap-4' : 'justify-center py-3 w-full'}
            `}
          >
            <span className="material-symbols-outlined">logout</span>
            {isOpen && <span className="font-label text-sm whitespace-nowrap">Cerrar sesión</span>}
          </Link>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
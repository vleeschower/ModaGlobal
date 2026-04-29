import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  
  // Definir todos los items del menú
  const allMenuItems = [
    { name: 'Inicio', icon: 'home', path: '/dashboard', roles: ['SuperAdministrador', 'Administrador', 'Cajero'] },
    { name: 'Usuarios', icon: 'group', path: '/dashboard/users', roles: ['SuperAdministrador', 'Administrador'] },
    { name: 'Tiendas', icon: 'store', path: '/dashboard/tiendas', roles: ['SuperAdministrador'] },
    { name: 'Productos', icon: 'inventory_2', path: '/dashboard/productos', roles: ['SuperAdministrador', 'Administrador', 'Cajero'] },
    { name: 'Stock en Red', icon: 'warehouse', path: '/dashboard/inventario', roles: ['SuperAdministrador', 'Administrador'] },
    { name: 'Reabastecimiento', icon: 'local_shipping', path: '/dashboard/solicitudes', roles: ['SuperAdministrador', 'Administrador'] },
    { name: 'Pedidos', icon: 'shopping_cart', path: '#', roles: ['SuperAdministrador', 'Administrador', 'Cajero'] },
  ];

  // Filtrar items según el rol del usuario
  const menuItems = allMenuItems.filter(item => {
    if (!user) return false;
    return item.roles.includes(user.rol);
  });

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
        navigate('/');
      }
    });
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-50 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      <aside className={`
        fixed left-0 top-0 bottom-0 z-50 flex flex-col py-8 bg-primary shadow-2xl transition-all duration-300 ease-in-out
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
                    ? 'bg-primary-esmeralda/20 text-white font-bold shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'}
                `}
                title={!isOpen ? item.name : ''}
              >
                <span className={`
                  material-symbols-outlined transition-colors
                  ${isActive ? 'text-primary-esmeralda' : 'text-gray-400 group-hover:text-white'}
                  ${!isOpen ? 'text-2xl' : 'text-xl'}
                `}>
                  {item.icon}
                </span>
                
                {isOpen && (
                  <span className="font-sans text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer del Sidebar - Cerrar sesión */}
        <div className="mt-auto pt-6 border-t border-white/10">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center text-gray-400 hover:text-red-400 transition-all rounded-xl
              ${isOpen ? 'px-4 py-3 gap-4' : 'justify-center py-3 w-full'}
              group
            `}
            title={!isOpen ? 'Cerrar sesión' : ''}
          >
            <span className={`
              material-symbols-outlined transition-colors
              ${!isOpen ? 'text-2xl' : 'text-xl'}
              group-hover:text-red-400
            `}>
              logout
            </span>
            {isOpen && (
              <span className="font-sans text-sm whitespace-nowrap group-hover:text-red-400 transition-colors">
                Cerrar sesión
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
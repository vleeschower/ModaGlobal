import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  toggleSidebar: () => void;
}

const DashboardHeader: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getRoleText = (rol: string) => {
    switch (rol) {
      case 'SuperAdministrador':
        return 'Super Administrador';
      case 'Administrador':
        return 'Administrador';
      case 'Cajero':
        return 'Cajero';
      default:
        return 'Usuario';
    }
  };

  const handleProfileClick = () => {
    navigate('/dashboard/perfil');
  };

  return (
    <header className="flex justify-between items-center w-full px-4 md:px-10 py-4 sticky top-0 bg-white/80 backdrop-blur-md z-40 border-b border-gray-200">
      
      {/* Lado Izquierdo */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-slate-800 shrink-0"
          aria-label="Toggle Sidebar"
        >
          <span className="material-symbols-outlined text-2xl md:text-3xl">menu</span>
        </button>
      </div>

      {/* Lado Derecho */}
      <div className="flex items-center gap-3 md:gap-6 shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-slate-900 leading-none">
            {user?.nombre || 'Cargando...'}
          </p>
          <p className="text-[10px] text-gray-500 font-sans uppercase tracking-widest mt-1">
            {user?.rol ? getRoleText(user.rol) : 'Cargando...'}
          </p>
        </div>
        
        {/* Botón de perfil con icono de persona - Redirige al perfil */}
        <button 
          onClick={handleProfileClick}
          className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl flex items-center justify-center bg-primary text-white shadow-lg shadow-slate-900/20 hover:bg-primary-esmeralda transition-all active:scale-95"
          title="Mi Perfil"
        >
          <span className="material-symbols-outlined text-2xl md:text-3xl">account_circle</span>
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
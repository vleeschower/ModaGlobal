import React from 'react';

interface HeaderProps {
  toggleSidebar: () => void;
}

const DashboardHeader: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  return (
    <header className="flex justify-between items-center w-full px-4 md:px-10 py-4 sticky top-0 bg-surface/40 backdrop-blur-md z-40 border-b border-outline-variant/10">
      
      {/* Lado Izquierdo */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-primary/10 rounded-xl transition-colors text-primary shrink-0"
          aria-label="Toggle Sidebar"
        >
          <span className="material-symbols-outlined text-2xl md:text-3xl">menu</span>
        </button>
      </div>

      {/* Lado Derecho */}
      <div className="flex items-center gap-3 md:gap-6 shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-primary leading-none">Alejandro M.</p>
          <p className="text-[10px] text-secondary font-label uppercase tracking-tighter mt-1">
            Administrador
          </p>
        </div>
        
        <button className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl flex items-center justify-center bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary-esmeralda transition-all active:scale-95">
          <span className="material-symbols-outlined text-2xl md:text-3xl">account_circle</span>
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;
import React from 'react';
import DashboardLayout from '../../components/dashboardLayout';

const UsersDashboard: React.FC = () => {
  const getRoleStyle = (role: string) => {
    switch (role.toLowerCase()) {
      case 'administrador':
        return 'bg-primary-esmeralda/10 text-primary-esmeralda';
      case 'cajero':
        return 'bg-amber-100 text-amber-700';
      case 'cliente':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <DashboardLayout>
        
        <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8">
            <section className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div className="space-y-1">
                <h3 className="text-2xl md:text-3xl font-headline font-bold text-primary tracking-tight">
                    Usuarios del sistema
                </h3>
                <p className="text-secondary text-sm font-label uppercase tracking-widest opacity-70">
                    Administración de personal y clientes
                </p>
                </div>
                <button className="w-full sm:w-auto bg-primary text-white text-sm px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-esmeralda transition-all shadow-xl shadow-primary/20 active:scale-95">
                <span className="material-symbols-outlined text-xl">person_add</span>
                Agregar usuario
                </button>
            </section>

            {/* Tabla de Usuarios */}
            <section className="bg-white rounded-2rem shadow-sm border border-outline-variant/30 overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-outline-variant">
                <table className="w-full text-left min-w-700px">
                    <thead className="bg-surface-container-low/50 border-b border-outline-variant/20">
                    <tr>
                        <th className="px-8 py-5 text-[10px] font-label uppercase tracking-widest text-secondary font-bold">Nombre</th>
                        <th className="px-8 py-5 text-[10px] font-label uppercase tracking-widest text-secondary font-bold">Teléfono</th>
                        <th className="px-8 py-5 text-[10px] font-label uppercase tracking-widest text-secondary font-bold">Rol</th>
                        <th className="px-8 py-5 text-[10px] font-label uppercase tracking-widest text-secondary font-bold text-right">Acciones</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                
                    <tr className="hover:bg-primary/5 transition-colors group">
                        <td className="px-8 py-5">
                        <p className="font-bold text-primary text-sm">Alejandro Mendoza</p>
                        <p className="text-xs text-secondary">a.mendoza@modaglobal.com</p>
                        </td>
                        <td className="px-8 py-5 text-sm text-secondary">961 123 4567</td>
                        <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getRoleStyle('administrador')}`}>
                            Administrador
                        </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                        <button className="p-2 text-secondary hover:text-primary transition-colors"><span className="material-symbols-outlined">edit</span></button>
                        <button className="p-2 text-secondary hover:text-error transition-colors"><span className="material-symbols-outlined">delete</span></button>
                        </td>
                    </tr>

                    <tr className="hover:bg-primary/5 transition-colors group">
                        <td className="px-8 py-5">
                        <p className="font-bold text-primary text-sm">Beatriz Ramos</p>
                        <p className="text-xs text-secondary">b.ramos@modaglobal.com</p>
                        </td>
                        <td className="px-8 py-5 text-sm text-secondary">961 987 6543</td>
                        <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getRoleStyle('cajero')}`}>
                            Cajero
                        </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                        <button className="p-2 text-secondary hover:text-primary transition-colors"><span className="material-symbols-outlined">edit</span></button>
                        <button className="p-2 text-secondary hover:text-error transition-colors"><span className="material-symbols-outlined">delete</span></button>
                        </td>
                    </tr>

                    <tr className="hover:bg-primary/5 transition-colors group">
                        <td className="px-8 py-5">
                        <p className="font-bold text-primary text-sm">Carlos Salazar</p>
                        <p className="text-xs text-secondary">c.salazar@gmail.com</p>
                        </td>
                        <td className="px-8 py-5 text-sm text-secondary">961 555 0011</td>
                        <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getRoleStyle('cliente')}`}>
                            Cliente
                        </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                        <button className="p-2 text-secondary hover:text-primary transition-colors"><span className="material-symbols-outlined">edit</span></button>
                        <button className="p-2 text-secondary hover:text-error transition-colors"><span className="material-symbols-outlined">delete</span></button>
                        </td>
                    </tr>
                    </tbody>
                </table>
                </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
                <div className="bg-white p-8 rounded-2rem border border-outline-variant/30 shadow-sm hover:border-primary/40 transition-all cursor-default group">
                <h5 className="font-bold text-secondary text-[10px] uppercase tracking-widest">Niveles de acceso</h5>
                <p className="text-xl font-bold mt-2 text-primary group-hover:text-primary-esmeralda transition-colors">Revisión de permisos</p>
                <div className="flex items-center gap-2 mt-4">
                    <span className="w-2 h-2 rounded-full bg-primary-esmeralda animate-pulse"></span>
                    <span className="text-xs text-secondary font-medium">Logs</span>
                </div>
                </div>
            </section>
        </div>
    
    </DashboardLayout>
  );
};

export default UsersDashboard;
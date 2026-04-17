import React from 'react';
import DashboardLayout from '../../components/dashboardLayout';

const UsersDashboard: React.FC = () => {
    const getRoleStyle = (role: string) => {
        switch (role.toLowerCase()) {
        case 'administrador':
            return 'bg-emerald-500/10 text-emerald-600'; // Usando el esmeralda para el admin
        case 'cajero':
            return 'bg-amber-100 text-amber-700';
        case 'cliente':
            return 'bg-blue-100 text-blue-700';
        default:
            return 'bg-gray-100 text-gray-600';
        }
    };

    return (
    <DashboardLayout>
        <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8 bg-surface min-h-screen">
            <section className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div className="space-y-1">
                <h3 className="text-2xl md:text-3xl font-headline font-bold text-slate-900 tracking-tight">
                Usuarios del sistema
                </h3>
                <p className="text-gray-500 text-sm font-label uppercase tracking-widest">
                Administración de personal y clientes
                </p>
            </div>
            <button className="w-full sm:w-auto bg-primary text-white text-sm px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-lg active:scale-95">
                <span className="material-symbols-outlined text-xl">person_add</span>
                Agregar usuario
            </button>
            </section>

            {/* Tabla de Usuarios */}
            <section className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-700px">
                <thead className="bg-surface-container-low border-b border-gray-200">
                    <tr>
                    <th className="px-8 py-5 text-[10px] uppercase tracking-widest text-gray-500 font-bold">Nombre</th>
                    <th className="px-8 py-5 text-[10px] uppercase tracking-widest text-gray-500 font-bold">Teléfono</th>
                    <th className="px-8 py-5 text-[10px] uppercase tracking-widest text-gray-500 font-bold">Rol</th>
                    <th className="px-8 py-5 text-[10px] uppercase tracking-widest text-gray-500 font-bold text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    
                    <tr className="hover:bg-gray-50 transition-colors group">
                    <td className="px-8 py-5">
                        <p className="font-bold text-slate-800 text-sm">Alejandro Mendoza</p>
                        <p className="text-xs text-gray-500">a.mendoza@modaglobal.com</p>
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-500">961 123 4567</td>
                    <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getRoleStyle('administrador')}`}>
                        Administrador
                        </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                        <button className="p-2 text-gray-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">edit</span></button>
                        <button className="p-2 text-gray-400 hover:text-red-500 transition-colors"><span className="material-symbols-outlined">delete</span></button>
                    </td>
                    </tr>

                    <tr className="hover:bg-gray-50 transition-colors group">
                    <td className="px-8 py-5">
                        <p className="font-bold text-slate-800 text-sm">Beatriz Ramos</p>
                        <p className="text-xs text-gray-500">b.ramos@modaglobal.com</p>
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-500">961 987 6543</td>
                    <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getRoleStyle('cajero')}`}>
                        Cajero
                        </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                        <button className="p-2 text-gray-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">edit</span></button>
                        <button className="p-2 text-gray-400 hover:text-red-500 transition-colors"><span className="material-symbols-outlined">delete</span></button>
                    </td>
                    </tr>

                    <tr className="hover:bg-gray-50 transition-colors group">
                    <td className="px-8 py-5">
                        <p className="font-bold text-slate-800 text-sm">Carlos Salazar</p>
                        <p className="text-xs text-gray-500">c.salazar@gmail.com</p>
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-500">961 555 0011</td>
                    <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getRoleStyle('cliente')}`}>
                        Cliente
                        </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                        <button className="p-2 text-gray-400 hover:text-primary transition-colors"><span className="material-symbols-outlined">edit</span></button>
                        <button className="p-2 text-gray-400 hover:text-red-500 transition-colors"><span className="material-symbols-outlined">delete</span></button>
                    </td>
                    </tr>
                </tbody>
                </table>
            </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm hover:border-emerald-300 transition-all cursor-default group">
                <h5 className="font-bold text-gray-500 text-[10px] uppercase tracking-widest">Niveles de acceso</h5>
                <p className="text-xl font-bold mt-2 text-slate-800 group-hover:text-emerald-500 transition-colors">Revisión de permisos</p>
                <div className="flex items-center gap-2 mt-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs text-gray-500 font-medium">Logs Activos</span>
                </div>
            </div>
            </section>
        </div>
        </DashboardLayout>
    );
};

export default UsersDashboard;
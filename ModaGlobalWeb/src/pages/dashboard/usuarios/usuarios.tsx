import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/dashboardLayout';
import { userService } from '../../../services/UserService';
import type { User } from '../../../services/UserService';
import Swal from 'sweetalert2';

const UsersDashboard: React.FC = () => {
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Obtener rol del usuario logueado
  useEffect(() => {
    const currentUser = userService.getCurrentUser();
    if (currentUser) {
      setCurrentUserRole(currentUser.rol);
    }
    fetchUsers();
  }, []);

  // Función para obtener lista de usuarios
  const fetchUsers = async () => {
    setLoading(true);
    const response = await userService.getAllUsers();
    
    if (response.success && response.users) {
      setUsers(response.users);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: response.message || 'Error al cargar los usuarios',
        confirmButtonColor: '#002727'
      });
    }
    setLoading(false);
  };

  // Verificar si puede crear usuarios
  const canCreateUsers = () => {
    return currentUserRole === 'SuperAdministrador' || currentUserRole === 'Administrador';
  };

  // Verificar si puede editar un usuario específico
  const canEditUser = (userRole: string) => {
    if (currentUserRole === 'SuperAdministrador') return true;
    if (currentUserRole === 'Administrador') {
      return userRole !== 'SuperAdministrador';
    }
    return false;
  };

  // Verificar si puede eliminar un usuario específico
  const canDeleteUser = (userRole: string) => {
    if (currentUserRole === 'SuperAdministrador') return true;
    if (currentUserRole === 'Administrador') {
      return userRole !== 'SuperAdministrador';
    }
    return false;
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'SuperAdministrador':
        return 'bg-purple-100 text-purple-700';
      case 'Administrador':
        return 'bg-primary-esmeralda/10 text-primary-esmeralda';
      case 'Cajero':
        return 'bg-amber-100 text-amber-700';
      case 'Cliente':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'SuperAdministrador':
        return 'Super Administrador';
      case 'Administrador':
        return 'Administrador';
      case 'Cajero':
        return 'Cajero';
      case 'Cliente':
        return 'Cliente';
      default:
        return role;
    }
  };

  const handleEdit = async (user: User) => {
    Swal.fire({
      title: 'Próximamente',
      text: 'Funcionalidad de edición en desarrollo',
      icon: 'info',
      confirmButtonColor: '#002727'
    });
  };

  const handleDelete = async (user: User) => {
    const result = await Swal.fire({
      title: '¿Eliminar usuario?',
      text: `¿Estás seguro de eliminar a ${user.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#002727',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      const response = await userService.deleteUser(user.id);
      
      if (response.success) {
        Swal.fire('Eliminado', 'Usuario eliminado correctamente', 'success');
        fetchUsers();
      } else {
        Swal.fire('Error', response.message || 'Error al eliminar el usuario', 'error');
      }
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
            {currentUserRole && (
              <p className="text-xs text-secondary mt-2">
                Tu rol: <span className="font-bold text-primary">{getRoleText(currentUserRole)}</span>
              </p>
            )}
          </div>
          
          {canCreateUsers() && (
            <button 
              onClick={() => {
                // Aquí puedes abrir el modal de agregar usuario
                Swal.fire({
                  title: 'Próximamente',
                  text: 'Funcionalidad de agregar usuario en desarrollo',
                  icon: 'info',
                  confirmButtonColor: '#002727'
                });
              }}
              className="w-full sm:w-auto bg-primary text-white text-sm px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-esmeralda transition-all shadow-xl shadow-primary/20 active:scale-95"
            >
              <span className="material-symbols-outlined text-xl">person_add</span>
              Agregar usuario
            </button>
          )}
        </section>

        {/* Tabla de Usuarios */}
        <section className="bg-white rounded-[2rem] shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-outline-variant">
            <table className="w-full text-left min-w-700px">
              <thead className="bg-surface-container-low/50 border-b border-outline-variant/20">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-label uppercase tracking-widest text-secondary font-bold">Nombre</th>
                  <th className="px-8 py-5 text-[10px] font-label uppercase tracking-widest text-secondary font-bold">Email</th>
                  <th className="px-8 py-5 text-[10px] font-label uppercase tracking-widest text-secondary font-bold">Teléfono</th>
                  <th className="px-8 py-5 text-[10px] font-label uppercase tracking-widest text-secondary font-bold">Rol</th>
                  <th className="px-8 py-5 text-[10px] font-label uppercase tracking-widest text-secondary font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-10 text-center text-secondary">
                      <div className="flex justify-center items-center gap-2">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        Cargando usuarios...
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-10 text-center text-secondary">
                      No hay usuarios registrados
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-8 py-5">
                        <p className="font-bold text-primary text-sm">{user.nombre}</p>
                      </td>
                      <td className="px-8 py-5 text-sm text-secondary">{user.email}</td>
                      <td className="px-8 py-5 text-sm text-secondary">{user.telefono || '-'}</td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getRoleStyle(user.rol)}`}>
                          {getRoleText(user.rol)}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        {canEditUser(user.rol) && (
                          <button 
                            onClick={() => handleEdit(user)}
                            className="p-2 text-secondary hover:text-primary-esmeralda transition-colors"
                            title="Editar usuario"
                          >
                            <span className="material-symbols-outlined text-xl">edit</span>
                          </button>
                        )}
                        {canDeleteUser(user.rol) && (
                          <button 
                            onClick={() => handleDelete(user)}
                            className="p-2 text-secondary hover:text-red-600 transition-colors"
                            title="Eliminar usuario"
                          >
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default UsersDashboard;
// pages/dashboard/usuarios/usuarios.tsx
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/dashboardLayout';
import { userService } from '../../../services/UserService';
import type { User } from '../../../services/UserService';
import { useAuth } from '../../../context/AuthContext';
import AddUserModal from './agregarUsuario';
import EditUserModal from './editarUSuario';
import Swal from 'sweetalert2';

const UsersDashboard: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const currentUserRole = currentUser?.rol || '';
  const currentUserTiendaId = currentUser?.id_tienda;
  const [currentUserTiendaNombre, setCurrentUserTiendaNombre] = useState<string>('');

  useEffect(() => {
    fetchUsers();
    if (currentUserRole === 'Administrador' && currentUserTiendaId) {
      obtenerNombreTienda();
    }
  }, []);

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

  const obtenerNombreTienda = async () => {
    try {
      const token = localStorage.getItem('mg_token');
      const response = await fetch(`http://localhost:3000/api/inventario/tiendas/${currentUserTiendaId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success && data.data) {
        setCurrentUserTiendaNombre(data.data.nombre);
      }
    } catch (error) {
      console.error('Error obteniendo nombre de tienda:', error);
    }
  };

  const canCreateUsers = () => {
    return currentUserRole === 'SuperAdministrador' || currentUserRole === 'Administrador';
  };

  const canEditUser = (userRole: string) => {
    if (currentUserRole === 'SuperAdministrador') return true;
    if (currentUserRole === 'Administrador') {
      return userRole !== 'SuperAdministrador';
    }
    return false;
  };

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

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
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
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        <section className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="space-y-1">
            <h3 className="text-2xl md:text-3xl font-headline font-bold text-primary tracking-tight">
              Usuarios del sistema
            </h3>
            <p className="text-secondary text-sm font-label uppercase tracking-widest opacity-70">
              Administración de personal
            </p>
            {currentUserRole && (
              <p className="text-xs text-secondary mt-2">
                Tu rol: <span className="font-bold text-primary">{getRoleText(currentUserRole)}</span>
                {currentUserTiendaId && ` | Tienda: ${currentUserTiendaNombre || currentUserTiendaId}`}
              </p>
            )}
          </div>
          
          {canCreateUsers() && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="w-full sm:w-auto bg-primary text-white text-sm px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-esmeralda transition-all shadow-xl shadow-primary/20 active:scale-95"
            >
              <span className="material-symbols-outlined text-xl">person_add</span>
              Agregar usuario
            </button>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Teléfono</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tienda</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      <div className="flex justify-center items-center gap-2">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                        Cargando usuarios...
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      No hay usuarios registrados
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-800 text-sm">{user.nombre}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.telefono || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleStyle(user.rol)}`}>
                          {getRoleText(user.rol)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.id_tienda || 'N/A'}</td>
                      <td className="px-6 py-4 text-right">
                        {canEditUser(user.rol) && (
                          <button 
                            onClick={() => handleEdit(user)}
                            className="p-1.5 text-gray-400 hover:text-primary-esmeralda transition-colors"
                            title="Editar usuario"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                        )}
                        {canDeleteUser(user.rol) && (
                          <button 
                            onClick={() => handleDelete(user)}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar usuario"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
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

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onUserAdded={fetchUsers}
        currentUserRole={currentUserRole}
        currentUserTiendaId={currentUserTiendaId}
        currentUserTiendaNombre={currentUserTiendaNombre}
      />

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        onUserUpdated={fetchUsers}
        user={selectedUser}
        currentUserRole={currentUserRole}
        currentUserTiendaId={currentUserTiendaId}
      />
    </DashboardLayout>
  );
};

export default UsersDashboard;
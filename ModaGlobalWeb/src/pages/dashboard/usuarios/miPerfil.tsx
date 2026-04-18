import React, { useState } from 'react';
import DashboardLayout from '../../../components/dashboardLayout';
import { useAuth } from '../../../context/AuthContext';
import { userService } from '../../../services/UserService';
import Swal from 'sweetalert2';

const PerfilDashboard: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    email: user?.email || '',
    telefono: user?.telefono || ''
  });

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);

    // Toda la validación está dentro de updateProfile
    const response = await userService.updateProfile(user!.id, {
      nombre: formData.nombre,
      email: formData.email,
      telefono: formData.telefono
    });

    setLoading(false);

    if (response.success) {
      // Actualizar el usuario en el contexto
      const updatedUser = {
        ...user!,
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono
      };
      updateUser(updatedUser);

      Swal.fire({
        icon: 'success',
        title: '¡Perfil actualizado!',
        text: 'Tus datos han sido actualizados correctamente',
        confirmButtonColor: '#002727',
        confirmButtonText: 'Entendido'
      });
      setIsEditing(false);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: response.message || 'No se pudieron actualizar los datos',
        confirmButtonColor: '#002727'
      });
    }
  };

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-xl md:text-3xl font-bold text-primary">Mi Perfil</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">Gestiona tu información personal</p>
        </div>

        {/* Tarjeta de perfil */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Banner de fondo con gradiente */}
          <div className="bg-gradient-to-r from-primary to-primary-esmeralda px-4 sm:px-6 md:px-8 pt-6 sm:pt-8 pb-8 sm:pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              {/* Avatar */}
              <div className="w-16 h-16 sm:w-15 sm:h-15 md:w-19 md:h-19 rounded-xl sm:rounded-2xl bg-white shadow-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-3xl sm:text-4xl md:text-5xl">account_circle</span>
              </div>
              
              {/* Nombre y rol */}
              <div>
                <h2 className="text-white text-xl sm:text-2xl md:text-3xl font-bold break-words">
                  {user.nombre}
                </h2>
                <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white mt-2">
                  {getRoleText(user.rol)}
                </span>
              </div>
            </div>
          </div>

          {/* Información personal */}
          <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-bold text-primary">Información personal</h3>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all text-xs sm:text-sm font-semibold"
                >
                  <span className="material-symbols-outlined text-sm sm:text-base">edit</span>
                  Editar perfil
                </button>
              ) : (
                <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all text-xs sm:text-sm font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-primary text-white hover:bg-primary-esmeralda transition-all text-xs sm:text-sm font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4 sm:space-y-5">
              {/* Nombre completo */}
              <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-3">
                <div className="md:w-1/3">
                  <label className="block text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    NOMBRE COMPLETO
                  </label>
                </div>
                <div className="md:w-2/3">
                  {isEditing ? (
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium text-sm sm:text-base break-words">
                      {user.nombre}
                    </p>
                  )}
                </div>
              </div>

              {/* Correo electrónico */}
              <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-3">
                <div className="md:w-1/3">
                  <label className="block text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    CORREO ELECTRÓNICO
                  </label>
                </div>
                <div className="md:w-2/3">
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full border border-gray-200 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                  ) : (
                    <p className="text-gray-800 text-sm sm:text-base break-all">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Teléfono */}
              <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-3">
                <div className="md:w-1/3">
                  <label className="block text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    TELÉFONO
                  </label>
                </div>
                <div className="md:w-2/3">
                  {isEditing ? (
                    <input
                      type="tel"
                      name="telefono"
                      value={formData.telefono || ''}
                      onChange={handleChange}
                      placeholder="No especificado"
                      className="w-full border border-gray-200 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    />
                  ) : (
                    <p className="text-gray-800 text-sm sm:text-base">
                      {user.telefono || 'No especificado'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PerfilDashboard;
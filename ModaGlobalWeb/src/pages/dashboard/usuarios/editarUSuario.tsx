import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { userService} from '../../../services/UserService';
import type { User } from '../../../services/UserService';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  user: User | null;
  currentUserRole: string;
  currentUserTiendaId?: string;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ 
  isOpen, 
  onClose, 
  onUserUpdated, 
  user,
}) => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        nombre: user.nombre || '',
        email: user.email || '',
        telefono: user.telefono || ''
      });
    }
  }, [user, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'El nombre no puede estar vacío',
        confirmButtonColor: '#002727'
      });
      return;
    }

    if (!formData.email.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campo requerido',
        text: 'El correo electrónico no puede estar vacío',
        confirmButtonColor: '#002727'
      });
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      Swal.fire({
        icon: 'warning',
        title: 'Formato inválido',
        text: 'Por favor ingresa un correo electrónico válido',
        confirmButtonColor: '#002727'
      });
      return;
    }

    setLoading(true);

    const response = await userService.updateUser(user!.id, {
      nombre: formData.nombre,
      email: formData.email,
      telefono: formData.telefono
    });

    setLoading(false);

    if (response.success) {
      Swal.fire({
        icon: 'success',
        title: '¡Usuario actualizado!',
        text: `Los datos de ${formData.nombre} han sido actualizados correctamente`,
        confirmButtonColor: '#002727'
      });
      onUserUpdated();
      onClose();
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: response.message || 'Error al actualizar el usuario',
        confirmButtonColor: '#002727'
      });
    }
  };

  if (!isOpen || !user) return null;

  const getRoleText = (rol: string) => {
    switch (rol) {
      case 'SuperAdministrador':
        return 'Super Administrador';
      case 'Administrador':
        return 'Administrador';
      case 'Cajero':
        return 'Cajero';
      case 'Cliente':
        return 'Cliente';
      default:
        return rol;
    }
  };

  const getRoleStyle = (rol: string) => {
    switch (rol) {
      case 'SuperAdministrador':
        return 'bg-purple-100 text-purple-700';
      case 'Administrador':
        return 'bg-primary-esmeralda/10 text-primary-esmeralda';
      case 'Cajero':
        return 'bg-amber-100 text-amber-700';
      case 'Cliente':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-primary">
                Editar Usuario
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                Modifica los datos del usuario
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleStyle(user.rol)}`}>
              {getRoleText(user.rol)}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Nombre Completo *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              className="w-full border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:border-primary transition-all"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Correo Electrónico *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:border-primary transition-all"
              placeholder="usuario@modaglobal.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              name="telefono"
              value={formData.telefono || ''}
              onChange={handleChange}
              placeholder="No especificado"
              className="w-full border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:border-primary transition-all"
            />
          </div>

          {/* Mostrar información de tienda (solo lectura) */}
          {user.id_tienda && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-1">Tienda asignada</p>
              <p className="text-sm font-medium text-gray-700">{user.id_tienda}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary text-white py-2 rounded-xl font-bold hover:bg-primary-esmeralda transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
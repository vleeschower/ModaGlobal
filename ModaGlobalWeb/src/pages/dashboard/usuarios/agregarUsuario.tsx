import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { userService } from '../../../services/UserService';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserAdded: () => void;
  currentUserRole: string;
  currentUserTiendaId?: string;
  currentUserTiendaNombre?: string;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ 
  isOpen, 
  onClose, 
  onUserAdded, 
  currentUserRole,
  currentUserTiendaId,
  currentUserTiendaNombre 
}) => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol_nombre: '',
    id_tienda: ''
  });
  const [tiendas, setTiendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTiendas, setLoadingTiendas] = useState(false);

  // Cargar tiendas SOLO si es SuperAdministrador
  useEffect(() => {
    if (isOpen && currentUserRole === 'SuperAdministrador') {
      cargarTiendas();
    }
  }, [isOpen, currentUserRole]);

  // Para Administrador, pre-asignar su tienda
  useEffect(() => {
    if (isOpen && currentUserRole === 'Administrador' && currentUserTiendaId) {
      setFormData(prev => ({
        ...prev,
        id_tienda: currentUserTiendaId
      }));
    }
  }, [isOpen, currentUserRole, currentUserTiendaId]);

  const cargarTiendas = async () => {
    setLoadingTiendas(true);
    try {
      const token = localStorage.getItem('mg_token');
      const response = await fetch('http://localhost:3000/api/inventario/tiendas', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setTiendas(data.data);
      }
    } catch (error) {
      console.error('Error cargando tiendas:', error);
    }
    setLoadingTiendas(false);
  };

  // Definir qué roles puede crear según el rol del usuario actual
  const getAvailableRoles = () => {
    switch (currentUserRole) {
      case 'SuperAdministrador':
        return [
          { value: 'SuperAdministrador', label: 'Super Administrador', requiereTienda: false },
          { value: 'Administrador', label: 'Administrador', requiereTienda: true },
          { value: 'Cajero', label: 'Cajero', requiereTienda: true }
        ];
      case 'Administrador':
        return [
          { value: 'Administrador', label: 'Administrador', requiereTienda: true },
          { value: 'Cajero', label: 'Cajero', requiereTienda: true }
        ];
      default:
        return [];
    }
  };

  const availableRoles = getAvailableRoles();
  const selectedRole = availableRoles.find(r => r.value === formData.rol_nombre);
  const requiereTienda = selectedRole?.requiereTienda || false;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre || !formData.email || !formData.password || !formData.rol_nombre) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor completa todos los campos requeridos',
        confirmButtonColor: '#002727'
      });
      return;
    }

    if (requiereTienda && !formData.id_tienda) {
      Swal.fire({
        icon: 'warning',
        title: 'Tienda requerida',
        text: 'Este rol requiere una tienda asignada',
        confirmButtonColor: '#002727'
      });
      return;
    }

    if (formData.rol_nombre === 'SuperAdministrador' && formData.id_tienda) {
      Swal.fire({
        icon: 'warning',
        title: 'Validación',
        text: 'Los SuperAdministradores no pueden tener tienda asignada',
        confirmButtonColor: '#002727'
      });
      return;
    }

    if (formData.password.length < 6) {
      Swal.fire({
        icon: 'warning',
        title: 'Contraseña débil',
        text: 'La contraseña debe tener al menos 6 caracteres',
        confirmButtonColor: '#002727'
      });
      return;
    }

    setLoading(true);

    const result = await userService.registerByAdmin({
      nombre: formData.nombre,
      email: formData.email,
      password: formData.password,
      rol_nombre: formData.rol_nombre,
      id_tienda: requiereTienda ? formData.id_tienda : undefined
    });

    setLoading(false);

    if (result.success) {
      Swal.fire({
        icon: 'success',
        title: 'Usuario creado',
        text: `El usuario ${formData.nombre} ha sido creado exitosamente`,
        confirmButtonColor: '#002727'
      });
      onUserAdded();
      onClose();
      setFormData({ nombre: '', email: '', password: '', rol_nombre: '', id_tienda: '' });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: result.message || 'Error al crear el usuario',
        confirmButtonColor: '#002727'
      });
    }
  };

  if (!isOpen) return null;

  // Determinar si mostrar selector de tiendas o texto fijo
  const mostrarSelectorTiendas = currentUserRole === 'SuperAdministrador' && requiereTienda;
  const mostrarTiendaFija = currentUserRole === 'Administrador' && requiereTienda;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-primary">
            Agregar Usuario
          </h3>
          <p className="text-gray-500 text-sm mt-1">
            {currentUserRole === 'SuperAdministrador' && 'Puedes crear SuperAdministradores, Administradores y Cajeros'}
            {currentUserRole === 'Administrador' && `Puedes crear Administradores y Cajeros en tu tienda: ${currentUserTiendaNombre || currentUserTiendaId}`}
          </p>
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
              Contraseña *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:border-primary transition-all"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Rol *
            </label>
            <select
              name="rol_nombre"
              value={formData.rol_nombre}
              onChange={handleChange}
              required
              className="w-full border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:border-primary transition-all"
            >
              <option value="">Seleccionar rol</option>
              {availableRoles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label} {role.requiereTienda ? '(requiere tienda)' : '(sin tienda)'}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de tiendas - SOLO para SuperAdministrador */}
          {mostrarSelectorTiendas && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Tienda Asignada *
              </label>
              <select
                name="id_tienda"
                value={formData.id_tienda}
                onChange={handleChange}
                required
                disabled={loadingTiendas}
                className="w-full border border-gray-200 rounded-xl py-2 px-4 focus:outline-none focus:border-primary transition-all disabled:opacity-50"
              >
                <option value="">Seleccionar tienda</option>
                {tiendas.map(tienda => (
                  <option key={tienda.id_tienda} value={tienda.id_tienda}>
                    {tienda.nombre} - {tienda.region}
                  </option>
                ))}
              </select>
              {loadingTiendas && <p className="text-xs text-gray-400 mt-1">Cargando tiendas...</p>}
            </div>
          )}

          {/* Tienda fija - para Administrador (solo lectura) */}
          {mostrarTiendaFija && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Tienda Asignada *
              </label>
              <input
                type="text"
                value={currentUserTiendaNombre || currentUserTiendaId || 'Tu tienda'}
                disabled
                className="w-full border border-gray-200 rounded-xl py-2 px-4 bg-gray-50 text-gray-600 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">
                Los usuarios se asignan automáticamente a tu tienda
              </p>
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
              {loading ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
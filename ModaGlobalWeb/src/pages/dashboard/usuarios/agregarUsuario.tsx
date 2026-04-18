// import React, { useState } from 'react';
// import Swal from 'sweetalert2';
// import { userService } from '../../../services/UserService';

// interface AddUserModalProps {
//   isOpen: boolean;
//   onClose: () => void;
//   onUserAdded: () => void;
//   currentUserRole: string; // rol del usuario logueado
// }

// const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onUserAdded, currentUserRole }) => {
//   const [formData, setFormData] = useState({
//     nombre: '',
//     email: '',
//     password: '',
//     rol: ''
//   });
//   const [loading, setLoading] = useState(false);

//   // Definir qué roles puede crear según el rol del usuario actual
//   const getAvailableRoles = () => {
//     switch (currentUserRole) {
//       case 'superadmin':
//         return [
//           { value: 'superadmin', label: 'Super Administrador' },
//           { value: 'admin', label: 'Administrador' },
//           { value: 'cajero', label: 'Cajero' }
//         ];
//       case 'admin':
//         return [
//           { value: 'admin', label: 'Administrador' },
//           { value: 'cajero', label: 'Cajero' }
//         ];
//       case 'cajero':
//         return []; // No puede crear usuarios
//       default:
//         return [];
//     }
//   };

//   const availableRoles = getAvailableRoles();

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//     setFormData({ ...formData, [e.target.name]: e.target.value });
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();

//     // Validaciones
//     if (!formData.nombre || !formData.email || !formData.password || !formData.rol) {
//       Swal.fire({
//         icon: 'warning',
//         title: 'Campos incompletos',
//         text: 'Por favor completa todos los campos requeridos',
//         confirmButtonColor: '#002727'
//       });
//       return;
//     }

//     if (formData.password.length < 6) {
//       Swal.fire({
//         icon: 'warning',
//         title: 'Contraseña débil',
//         text: 'La contraseña debe tener al menos 6 caracteres',
//         confirmButtonColor: '#002727'
//       });
//       return;
//     }

//     setLoading(true);

//     // Registrar usuario
//     const result = await userService.register({
//       nombre: formData.nombre,
//       email: formData.email,
//       password: formData.password,
//       id_rol: formData.rol
//     });

//     setLoading(false);

//     if (result.success) {
//       Swal.fire({
//         icon: 'success',
//         title: 'Usuario creado',
//         text: `El usuario ${formData.nombre} ha sido creado exitosamente`,
//         confirmButtonColor: '#002727'
//       });
//       onUserAdded(); // Recargar lista de usuarios
//       onClose(); // Cerrar modal
//       setFormData({ nombre: '', email: '', password: '', rol: '' }); // Limpiar formulario
//     } else {
//       Swal.fire({
//         icon: 'error',
//         title: 'Error',
//         text: result.message || 'Error al crear el usuario',
//         confirmButtonColor: '#002727'
//       });
//     }
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
//         <div className="p-6 border-b border-outline-variant/20">
//           <h3 className="text-2xl font-headline font-bold text-primary">
//             Agregar Usuario
//           </h3>
//           <p className="text-secondary text-sm mt-1">
//             {currentUserRole === 'superadmin' && 'Puedes crear Super Admin, Admin y Cajeros'}
//             {currentUserRole === 'admin' && 'Puedes crear Admin y Cajeros'}
//             {currentUserRole === 'cajero' && 'No tienes permisos para crear usuarios'}
//           </p>
//         </div>

//         <form onSubmit={handleSubmit} className="p-6 space-y-4">
//           <div>
//             <label className="block text-xs font-label font-semibold text-secondary uppercase tracking-wider mb-2">
//               Nombre Completo *
//             </label>
//             <input
//               type="text"
//               name="nombre"
//               value={formData.nombre}
//               onChange={handleChange}
//               required
//               className="w-full bg-transparent border border-outline-variant/30 rounded-xl py-2 px-4 focus:outline-none focus:border-primary transition-all"
//               placeholder="John Doe"
//             />
//           </div>

//           <div>
//             <label className="block text-xs font-label font-semibold text-secondary uppercase tracking-wider mb-2">
//               Correo Electrónico *
//             </label>
//             <input
//               type="email"
//               name="email"
//               value={formData.email}
//               onChange={handleChange}
//               required
//               className="w-full bg-transparent border border-outline-variant/30 rounded-xl py-2 px-4 focus:outline-none focus:border-primary transition-all"
//               placeholder="usuario@modaglobal.com"
//             />
//           </div>

//           <div>
//             <label className="block text-xs font-label font-semibold text-secondary uppercase tracking-wider mb-2">
//               Contraseña *
//             </label>
//             <input
//               type="password"
//               name="password"
//               value={formData.password}
//               onChange={handleChange}
//               required
//               className="w-full bg-transparent border border-outline-variant/30 rounded-xl py-2 px-4 focus:outline-none focus:border-primary transition-all"
//               placeholder="Mínimo 6 caracteres"
//             />
//           </div>

//           <div>
//             <label className="block text-xs font-label font-semibold text-secondary uppercase tracking-wider mb-2">
//               Rol *
//             </label>
//             <select
//               name="rol"
//               value={formData.rol}
//               onChange={handleChange}
//               required
//               disabled={currentUserRole === 'cajero'}
//               className="w-full bg-transparent border border-outline-variant/30 rounded-xl py-2 px-4 focus:outline-none focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               <option value="">Seleccionar rol</option>
//               {availableRoles.map(role => (
//                 <option key={role.value} value={role.value}>
//                   {role.label}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div className="flex gap-3 pt-4">
//             <button
//               type="button"
//               onClick={onClose}
//               className="flex-1 px-4 py-2 border border-outline-variant/30 rounded-xl text-secondary hover:bg-surface-container-low transition-all"
//             >
//               Cancelar
//             </button>
//             <button
//               type="submit"
//               disabled={loading || currentUserRole === 'cajero'}
//               className="flex-1 bg-primary text-white py-2 rounded-xl font-bold hover:bg-primary-esmeralda transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//             >
//               {loading ? 'Creando...' : 'Crear Usuario'}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default AddUserModal;
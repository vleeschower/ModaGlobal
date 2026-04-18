import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Compra from '../assets/compra.jpg';
import { userService } from '../services/UserService';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validar contraseñas
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    // Validar longitud mínima
    if (formData.password.length < 8) {
      setError('Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial');
      return;
    }

    setLoading(true);

    const result = await userService.register({
      nombre: formData.nombre,
      email: formData.email,
      password: formData.password,
    });

    setLoading(false);

    if (result.success) {
      // Alerta de éxito
      Swal.fire({
        icon: 'success',
        title: '¡Registro exitoso!',
        text: 'Tu cuenta ha sido creada correctamente',
        confirmButtonColor: '#002727',
        confirmButtonText: 'Iniciar sesión'
      }).then(() => {
        navigate('/login');
      });
    } else if (!result.success) {
      // Alerta de error
      Swal.fire({
        icon: 'error',
        title: 'Error al registrar',
        text: result.message || 'Error al crear la cuenta',
        confirmButtonColor: '#002727',
        confirmButtonText: 'Intentar de nuevo'
      });
    }
  };

  return (
    <main className="flex min-h-screen bg-surface font-body text-on-surface antialiased">
      <section className="hidden lg:flex w-1/2 relative overflow-hidden bg-primary">
        <div className="absolute inset-0 z-0">
          <img
            alt="ModaGlobal Editorial"
            className="w-full h-full object-cover mix-blend-overlay opacity-80"
            src={Compra}
          />
        </div>
        <div className="absolute inset-0 z-10 bg-linear-to-br from-[#00272766] to-[#163d3dcc]" />
        <div className="relative z-20 flex flex-col justify-between p-16 w-full text-white">
          <div>
            <h1 className="text-3xl font-headline font-bold tracking-tighter mb-4">
              ModaGlobal
            </h1>
          </div>
          <div className="max-w-md">
            <h2 className="text-3xl font-headline font-extrabold leading-tight mb-6">
              Únete a la mejor experiencia de compra.
            </h2>
            <div className="h-1 w-24 bg-primary-esmeralda rounded-full mb-8"></div>
            <p className="text-lg opacity-70 leading-relaxed font-light">
              Tecnología, accesorios y moda en un solo lugar.
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs font-label uppercase tracking-widest opacity-60">
            <span>© 2026 ModaGlobal</span>
          </div>
        </div>
      </section>

      <section className="w-full lg:w-1/2 flex items-center justify-center bg-surface px-6 md:px-16 lg:px-24 py-12">
        <div className="w-full max-w-md space-y-10">
          <div className="lg:hidden text-center">
            <h1 className="text-3xl font-headline font-bold tracking-tighter text-primary">
              ModaGlobal
            </h1>
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-headline font-bold text-primary tracking-tight">
              Crear cuenta
            </h2>
            <p className="text-secondary text-sm">
              Regístrate como cliente para comenzar a comprar
            </p>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="relative group">
                <label 
                  htmlFor="nombre"
                  className="block text-xs font-label font-semibold text-secondary uppercase tracking-wider mb-2 group-focus-within:text-primary transition-colors"
                >
                  Nombre Completo
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-outline-variant/30 py-3 focus:outline-none focus:border-primary transition-all text-on-surface placeholder:text-outline-variant/60 border-t-0 border-x-0 focus:ring-0"
                  placeholder="John Aguilar"
                  required
                />
              </div>
              
              <div className="relative group">
                <label 
                  htmlFor="email"
                  className="block text-xs font-label font-semibold text-secondary uppercase tracking-wider mb-2 group-focus-within:text-primary transition-colors"
                >
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-outline-variant/30 py-3 focus:outline-none focus:border-primary transition-all text-on-surface placeholder:text-outline-variant/60 border-t-0 border-x-0 focus:ring-0"
                  placeholder="ejemplo@modaglobal.com"
                  required
                />
              </div>
              
              <div className="relative group">
                <label 
                  htmlFor="password"
                  className="block text-xs font-label font-semibold text-secondary uppercase tracking-wider mb-2 group-focus-within:text-primary transition-colors"
                >
                  Contraseña
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-outline-variant/30 py-3 focus:outline-none focus:border-primary transition-all text-on-surface placeholder:text-outline-variant/60 border-t-0 border-x-0 focus:ring-0"
                  placeholder="Mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial"
                  required
                />
              </div>
              
              <div className="relative group">
                <label 
                  htmlFor="confirmPassword"
                  className="block text-xs font-label font-semibold text-secondary uppercase tracking-wider mb-2 group-focus-within:text-primary transition-colors"
                >
                  Confirmar Contraseña
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-outline-variant/30 py-3 focus:outline-none focus:border-primary transition-all text-on-surface placeholder:text-outline-variant/60 border-t-0 border-x-0 focus:ring-0"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-xl font-headline font-bold text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:bg-primary-esmeralda transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
          </form>
          
          <div className="text-center pt-2 border-t border-outline-variant/10">
            <p className="text-secondary font-label text-sm">
              ¿Ya tienes una cuenta?
              <Link 
                to="/login" 
                className="text-primary font-bold ml-1 hover:underline underline-offset-4 decoration-primary decoration-2 transition-all"
              >
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Register;
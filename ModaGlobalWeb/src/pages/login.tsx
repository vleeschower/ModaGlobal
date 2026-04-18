import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import Fondo from '../assets/fondoL.jpg';
import { userService } from '../services/UserService';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!email || !password) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor ingresa tu correo y contraseña',
        confirmButtonColor: '#002727',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    setLoading(true);

    // Llamar al servicio de login
    const result = await userService.login(email, password);

    setLoading(false);

    if (result.success && result.user) {
      // Login exitoso - redirigir según el rol
      const rol = result.user.rol;
      
      // Mensaje de bienvenida
      Swal.fire({
        icon: 'success',
        title: `¡Bienvenido!`,
        text: `Has iniciado sesión como ${getRolText(rol)}`,
        confirmButtonColor: '#002727',
        confirmButtonText: 'Continuar',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: true
      }).then(() => {
        // Redirigir según el rol
        redirectByRole(rol);
      });
    } else {
      // Error de login
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: result.message || 'Credenciales inválidas. Por favor intenta de nuevo.',
        confirmButtonColor: '#002727',
        confirmButtonText: 'Intentar de nuevo'
      });
    }
  };

  // Función para obtener texto amigable del rol
  const getRolText = (rol: string): string => {
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
      return 'Usuario';
  }
};

 // Función para redirigir según el rol
const redirectByRole = (rol: string) => {
  switch (rol) {
    case 'SuperAdministrador':
    case 'Administrador':
    case 'Cajero':
      navigate('/dashboard/users');
      break;
    case 'Cliente':
      navigate('/');
      break;
    default:
      navigate('/');
      break;
  }
};


  return (
    <main className="flex min-h-screen bg-surface font-body text-on-surface antialiased">
      <section className="hidden lg:flex w-1/2 relative overflow-hidden bg-primary">
        <div className="absolute inset-0 z-0">
          <img
            alt="ModaGlobal Editorial"
            className="w-full h-full object-cover mix-blend-overlay opacity-80"
            src={Fondo}
          />
        </div>
        
        {/* Degradado oscuro usando nuestro color primario */}
        <div className="absolute inset-0 z-10 bg-linear-to-br from-primary/90 to-primary/60" />

        <div className="relative z-20 flex flex-col justify-between p-16 w-full text-white">
          <div>
            <h1 className="text-3xl font-headline font-bold tracking-tighter mb-4">
              Moda<span className="text-primary-esmeralda">Global</span>
            </h1>
          </div>

          <div className="max-w-md">
            <h2 className="text-3xl font-headline font-extrabold leading-tight mb-6">
              Toda la tecnología, accesorios y moda en un solo lugar.
            </h2>
            <div className="h-1 w-24 bg-primary-esmeralda rounded-full mb-8"></div>
            <p className="text-lg opacity-80 leading-relaxed font-light">
              Explora un catálogo infinito con lo último en electrónica, tendencias 
              y lo mejor de la moda. Tu destino único para todo lo que necesitas.
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs uppercase tracking-widest opacity-60">
            <span>© 2026 ModaGlobal</span>
          </div>
        </div>
      </section>

      <section className="w-full lg:w-1/2 flex items-center justify-center bg-white px-6 md:px-16 lg:px-24 py-12">
        <div className="w-full max-w-md space-y-12">
          <div className="lg:hidden text-center">
            <h1 className="text-3xl font-headline font-bold tracking-tighter text-slate-900">
              Moda<span className="text-primary-esmeralda">Global</span>
            </h1>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-headline font-black text-slate-900 tracking-tight">
              Bienvenido de nuevo
            </h2>
            <p className="text-gray-500 text-sm">
              Introduce tus credenciales para acceder a tu cuenta.
            </p>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="relative group">
                <label 
                  htmlFor="email"
                  className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 group-focus-within:text-emerald-500 transition-colors"
                >
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b border-gray-300 py-3 focus:outline-none focus:border-emerald-500 transition-all text-slate-900 placeholder:text-gray-400 border-t-0 border-x-0 focus:ring-0"
                  placeholder="ejemplo@modaglobal.com"
                  required
                  disabled={loading}
                />
              </div>

              <div className="relative group">
                <div className="flex justify-between items-center mb-2">
                  <label 
                    htmlFor="password"
                    className="block text-xs font-semibold text-gray-500 uppercase tracking-wider group-focus-within:text-emerald-500 transition-colors"
                  >
                    Contraseña
                  </label>
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-gray-300 py-3 focus:outline-none focus:border-emerald-500 transition-all text-slate-900 placeholder:text-gray-400 border-t-0 border-x-0 focus:ring-0"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-xl font-headline font-bold text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:bg-primary-esmeralda transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="text-center pt-6 border-t border-gray-100">
            <p className="text-gray-500 text-sm">
              ¿No tienes una cuenta?
              <Link 
                to="/register" 
                className="text-primary font-bold ml-1 hover:underline underline-offset-4 decoration-primary decoration-2 transition-all"
              >
                Crear cuenta
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Login;
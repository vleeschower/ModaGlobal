import React, { useState } from 'react';
import Fondo from '../assets/fondoL.jpg';
import { Link } from 'react-router-dom';

const Login: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt with:', { email, password });
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
        
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-[#00272766] to-[#163d3dcc]" />

        <div className="relative z-20 flex flex-col justify-between p-16 w-full text-white">
          <div>
            <h1 className="text-3xl font-headline font-bold tracking-tighter mb-4">
              ModaGlobal
            </h1>
          </div>

          <div className="max-w-md">
            <h2 className="text-3xl font-headline font-extrabold leading-tight mb-6">
              Toda la tecnología, accesorios y moda en un solo lugar.
            </h2>
            <div className="h-1 w-24 bg-primary-esmeralda rounded-full mb-8"></div>
            <p className="text-lg opacity-70 leading-relaxed font-light">
              Explora un catálogo infinito con lo último en electrónica, tendencias 
              y lo mejor de la moda. Tu destino único para todo lo que necesitas.
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-label uppercase tracking-widest opacity-60">
            <span>© 2026 ModaGlobal</span>
          </div>
        </div>
      </section>

      <section className="w-full lg:w-1/2 flex items-center justify-center bg-surface px-6 md:px-16 lg:px-24 py-12">
        <div className="w-full max-w-md space-y-12">
   
          <div className="lg:hidden text-center">
            <h1 className="text-3xl font-headline font-bold tracking-tighter text-primary">
              ModaGlobal
            </h1>
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-headline font-bold text-primary tracking-tight">
              Bienvenido de nuevo
            </h2>
            <p className="text-secondary font-label text-sm">
              Introduce tus credenciales para acceder a tu cuenta.
            </p>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="space-y-6">
         
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b border-outline-variant/30 py-3 focus:outline-none focus:border-primary transition-all text-on-surface placeholder:text-outline-variant/60 border-t-0 border-x-0 focus:ring-0"
                  placeholder="ejemplo@modaglobal.com"
                  required
                />
              </div>

              <div className="relative group">
                <div className="flex justify-between items-center mb-2">
                  <label 
                    htmlFor="password"
                    className="block text-xs font-label font-semibold text-secondary uppercase tracking-wider group-focus-within:text-primary transition-colors"
                  >
                    Contraseña
                  </label>
                 
                </div>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-outline-variant/30 py-3 focus:outline-none focus:border-primary transition-all text-on-surface placeholder:text-outline-variant/60 border-t-0 border-x-0 focus:ring-0"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-xl font-headline font-bold text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:bg-primary-esmeralda transition-all"
            >
              Iniciar Sesión
            </button>
          </form>

          <div className="text-center pt-4 border-t border-outline-variant/10">
            <p className="text-secondary font-label text-sm">
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
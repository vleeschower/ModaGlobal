import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Compra from '../assets/compra.jpg';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Registration attempt:', formData);
  };

  return (
    <main className="flex min-h-screen bg-surface font-body text-on-surface antialiased">
      {/* SECCIÓN IZQUIERDA: Editorial (Visible en LG+) */}
      <section className="hidden lg:flex w-1/2 relative overflow-hidden bg-primary">
        <div className="absolute inset-0 z-0">
          <img
            alt="ModaGlobal Editorial"
            className="w-full h-full object-cover mix-blend-overlay opacity-80"
            src={Compra}
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

      {/* SECCIÓN DERECHA: Formulario de Registro */}
      <section className="w-full lg:w-1/2 flex items-center justify-center bg-surface px-6 md:px-16 lg:px-24 py-12">
        <div className="w-full max-w-md space-y-10">
          {/* Brand Header (Mobile Only) */}
          <div className="lg:hidden text-center">
            <h1 className="text-3xl font-headline font-bold tracking-tighter text-primary">
              ModaGlobal
            </h1>
          </div>

          {/* Form Heading */}
          <div className="space-y-4">
            <h2 className="text-3xl font-headline font-bold text-primary tracking-tight">
              Crear cuenta
            </h2>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="relative group">
                <label 
                  htmlFor="fullName"
                  className="block text-xs font-label font-semibold text-secondary uppercase tracking-wider mb-2 group-focus-within:text-primary transition-colors"
                >
                  Nombre Completo
                </label>
                <input
                  type="text"
                  id="fullName"
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-outline-variant/30 py-3 focus:outline-none focus:border-primary transition-all text-on-surface placeholder:text-outline-variant/60 border-t-0 border-x-0 focus:ring-0"
                  placeholder="John Doe"
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
                  onChange={handleChange}
                  className="w-full bg-transparent border-b border-outline-variant/30 py-3 focus:outline-none focus:border-primary transition-all text-on-surface placeholder:text-outline-variant/60 border-t-0 border-x-0 focus:ring-0"
                  placeholder="••••••••"
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
                  onChange={handleChange}
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
              Registrarse
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
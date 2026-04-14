import React from 'react';
import logoImg from '../assets/logom.png';

const Footer: React.FC = () => {
  return (
    <footer className="bg-primary w-full mt-20">
      <div className="max-w-1440px mx-auto px-8 md:px-16 py-16 border-t border-white/5 font-body text-sm leading-relaxed text-emerald-50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 items-start">
          
          <div className="md:col-span-2 lg:col-span-2 flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <div className="shrink-0">
              <img 
                src={logoImg} 
                alt="ModaGlobal Logo" 
                className="h-24 w-auto object-contain"
              />
            </div>

            <div className="text-center sm:text-left pt-2">
              <span className="font-headline font-bold text-2xl text-white block mb-2 tracking-tight">
                ModaGlobal
              </span>
              <p className="text-emerald-100/60 max-w-sm text-base">
                Ofreciendo los productos más exclusivos con un enfoque en la calidad y el diseño impecable.
              </p>
            </div>
          </div>

          <div className="hidden lg:block"></div>

          <div className="flex flex-col items-center md:items-end text-center md:text-right">
            <h5 className="text-primary-esmeralda font-bold mb-6 uppercase tracking-widest text-xs">
              Contacto
            </h5>
            <div className="flex gap-6 mb-6">
              {/* Facebook */}
              <a href="#" className="group">
                <div className="p-3 rounded-full bg-white/5 group-hover:bg-white/10 transition-all border border-white/10 group-hover:border-white/20">
                  <svg className="w-5 h-5 fill-emerald-100/60 group-hover:fill-white" viewBox="0 0 24 24">
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-2.21c0-.837.398-1.29 1.144-1.29h2.856v-4.506c-1.202-.153-2.607-.244-3.545-.244-2.852 0-4.455 1.492-4.455 4.137v2.113z"/>
                  </svg>
                </div>
              </a>
              {/* Instagram */}
              <a href="#" className="group">
                <div className="p-3 rounded-full bg-white/5 group-hover:bg-white/10 transition-all border border-white/10 group-hover:border-white/20">
                  <svg className="w-5 h-5 fill-emerald-100/60 group-hover:fill-white" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
              </a>
            </div>
          </div>

        </div>
      </div>

      <div className="max-w-1440px mx-auto px-16 pb-8 border-t border-white/5 pt-8">
        <p className="text-primary-esmeralda text-xs text-center italic">
          © 2026 ModaGlobal.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
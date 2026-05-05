import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/header';
import Footer from '../components/footer';
import ImagenHome from '../assets/imagenHome.jpg';
import ProductCard from '../components/ProductCard'; // <-- Importamos tu componente real
import { apiService } from '../services/ApiService';
import { type Producto } from '../types/Producto';

const Home: React.FC = () => {
  // Estado para guardar los productos reales de la Base de Datos
  const [productosDestacados, setProductosDestacados] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargamos los productos al iniciar la página
  useEffect(() => {
    const fetchDestacados = async () => {
      setLoading(true);
      // Pedimos la página 1 con un límite de 10 productos
      const response = await apiService.getProductos(1, 10);
      
      if (response.success && response.data) {
        setProductosDestacados(response.data);
      }
      setLoading(false);
    };

    fetchDestacados();
  }, []);

  return (
    <div className="bg-surface min-h-screen flex flex-col">
      <Header />

      <main className="grow">
        {/* Hero Section (Se mantiene igual) */}
        <header className="relative w-full h-400px md:h-500px lg:h-550px flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              alt="Hero Accessories"
              className="w-full h-full object-cover"
              src={ImagenHome}
            />
            <div className="absolute inset-0 bg-linear-to-r from-primary/90 via-primary/80 to-transparent"></div>
          </div>
          <div className="relative z-10 max-w-1440px mx-auto px-6 md:px-16 w-full">
          <div className="max-w-2xl text-white">
            <h1 className="font-headline text-3xl md:text-5xl font-extrabold tracking-tighter leading-tight mb-6">
              Lo mejor del mundo, <br />
              <span className="text-primary-esmeralda">variedad para tu estilo.</span>
            </h1>
            <Link 
              to="/catalogo" 
              className="inline-flex items-center gap-2 bg-primary-esmeralda text-white px-6 py-3 rounded-md font-bold hover:bg-primary transition-all group text-sm md:text-base shadow-lg w-max"
            >
              <span>Comprar ahora</span>
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </Link>
          </div>
        </div>
        </header>

        {/* Info Cards (Se mantiene igual) */}
        <section className="bg-surface-container-low py-20 px-6 md:px-16">
          <div className="max-w-1440px mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: 'store', title: 'Recoger en tienda', desc: 'Compra online y recoge lo antes posible' },
              { icon: 'headset_mic', title: 'Atención personalizada', desc: 'Expertos a tu disposición' },
              { icon: 'verified_user', title: 'Garantía total', desc: 'Protección en cada compra' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-full text-primary-esmeralda">
                  <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ✨ NUEVO CARRUSEL CON PRODUCTOS REALES ✨ */}
        <section className="pb-20 bg-[#F8F9FA] overflow-hidden">
          <div className="max-w-1440px mx-auto px-6 md:px-16 pt-10">
            <div className="flex justify-between items-end mb-10">
              <h2 className="text-2xl md:text-3xl font-headline font-bold text-slate-900">Ofertas y Novedades</h2>
              <Link to="/catalogo" className="text-sm font-bold text-primary hover:text-primary-esmeralda transition-colors flex items-center gap-1 group">
                Ver todo <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
               <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            // Contenedor del Carrusel (Scroll Horizontal)
            <div className="px-6 md:px-16 pb-6">
              <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar" style={{ scrollBehavior: 'smooth' }}>
                
                {productosDestacados.map((product) => (
                  // Limitamos el ancho para que quepan ~4 en pantallas grandes, pero permitan deslizar
                  <div key={product.id_producto} className="min-w-280px md:min-w-300px lg:min-w-[320px] max-w-[320px] snap-start flex-none">
                    {/* Reutilizamos el ProductCard original */}
                    <ProductCard product={product} />
                  </div>
                ))}

                {/* Tarjeta final para redirigir al catálogo */}
                <div className="min-w-280px md:min-w-300px lg:min-w-[320px] snap-start flex-none">
                  <Link to="/catalogo" className="h-full flex flex-col items-center justify-center bg-emerald-50 rounded-3xl border-2 border-dashed border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-colors p-8 text-emerald-600 group">
                     <span className="material-symbols-outlined text-5xl mb-4 group-hover:translate-x-2 transition-transform">arrow_right_alt</span>
                     <h3 className="font-bold text-xl text-center">Ver todos los productos</h3>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Banner Section (Se mantiene igual) */}
        <section className="pb-20 px-6 md:px-16 bg-[#F8F9FA]">
             {/* ... Tu código del banner Urban Sneaker ... */}
        </section>

        {/* Tendencias (Se mantiene igual) */}
        <section className="pb-20 px-6 md:px-16 bg-[#F8F9FA]">
             {/* ... Tu código de Tendencias Otoño Invierno ... */}
        </section>

        {/* Tecnología (Se mantiene igual) */}
        <section className="pb-20 px-6 md:px-16 bg-[#F8F9FA]">
             {/* ... Tu código de Tecnología ... */}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
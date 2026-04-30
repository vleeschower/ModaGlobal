import React from 'react';
import Header from '../components/header';
import Footer from '../components/footer';
import ImagenHome from '../assets/imagenHome.jpg';
import { useCart } from '../context/CartContext'; // <-- Importamos el contexto del carrito

const Home: React.FC = () => {
  const { addToCart } = useCart(); // <-- Sacamos la función para agregar

  const offers = [
    { id: 1, name: 'Aura Sound Max', desc: 'Audífonos inalámbricos de lujo', price: 349.00, oldPrice: 410.00, discount: '-20%', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop' },
    { id: 2, name: 'Nexus Watch Elite', desc: 'Reloj inteligente premium', price: 299.00, oldPrice: 343.85, discount: '-15%', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop' },
    { id: 3, name: 'Zenith Pro', desc: 'Cancelación de ruido activa', price: 189.00, oldPrice: 245.70, discount: '-30%', img: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?q=80&w=1000&auto=format&fit=crop' },
    { id: 4, name: 'Vantage X1', desc: 'Accesorios de lujo', price: 120.00, oldPrice: 132.00, discount: '-10%', img: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=1000&auto=format&fit=crop' },
  ];

  const techTrends = [
    { title: 'Laptops', img: 'https://cdn.thewirecutter.com/wp-content/media/2024/07/laptopstopicpage-2048px-3685-2x1-1.jpg?width=2048&quality=75&crop=2:1&auto=webp' },
    { title: 'Celulares', img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1000&auto=format&fit=crop' },
    { title: 'Smartwatches', img: 'https://images.unsplash.com/photo-1544117519-31a4b719223d?q=80&w=1000&auto=format&fit=crop' },
    { title: 'Audio Hi-Fi', img: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=1000&auto=format&fit=crop' }
  ];

  return (
    <div className="bg-surface min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow">
        {/* Hero Section */}
        <header className="relative w-full h-[400px] md:h-[500px] lg:h-[550px] flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              alt="Hero Accessories"
              className="w-full h-full object-cover"
              src={ImagenHome}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-transparent"></div>
          </div>
          <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-16 w-full">
            <div className="max-w-2xl text-white">
              <h1 className="font-headline text-3xl md:text-5xl font-extrabold tracking-tighter leading-tight mb-6">
                Lo mejor del mundo, <br />
                <span className="text-primary-esmeralda">variedad para tu estilo.</span>
              </h1>
              <button className="bg-primary-esmeralda text-white px-6 py-3 rounded-md font-bold flex items-center gap-3 hover:bg-primary transition-all group text-sm md:text-base shadow-lg">
                Comprar ahora
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>
        </header>

        {/* Info Cards */}
        <section className="bg-surface-container-low py-20 px-6 md:px-16">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
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

        {/* Daily Offers Section */}
        <section className="pb-20 px-6 md:px-16 bg-[#F8F9FA]">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex justify-between items-end mb-10">
              <h2 className="text-2xl md:text-3xl font-headline font-bold text-slate-900">Ofertas del día</h2>
              <a href="#" className="text-sm font-bold text-primary hover:text-primary-esmeralda transition-colors flex items-center gap-1">
                Ver todo <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {offers.map((product) => (
                <div key={product.id} className="group bg-white rounded-3xl overflow-hidden hover:shadow-md transition-shadow duration-300 border border-gray-100 flex flex-col">
                  <div className="aspect-[4/3] bg-[#E9ECEF] relative overflow-hidden">
                    <img
                      src={product.img}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-slate-800 text-sm md:text-base">{product.name}</h4>
                      <span className="bg-red-50 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        {product.discount}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mb-4 flex-grow">{product.desc}</p>

                    <div className="flex flex-col gap-3 mt-auto">
                      <div className="flex items-center gap-2">
                        <span className="text-primary-esmeralda font-black text-lg">${product.price.toFixed(2)}</span>
                        <span className="text-gray-400 line-through text-xs">${product.oldPrice.toFixed(2)}</span>
                      </div>
                      
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          addToCart({
                            id_producto: `oferta-${product.id}`,
                            nombre: product.name,
                            precio_base: product.price,
                            imagen_url: product.img,
                            id_categoria: 'ofertas',
                            sku: `OFERTA-00${product.id}`
                          } as any, 1);
                        }}
                        className="w-full bg-gray-50 text-slate-800 border border-gray-200 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all flex items-center justify-center gap-2 mt-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Banner Section */}
        <section className="pb-20 px-6 md:px-16 bg-[#F8F9FA]">
          <div className="max-w-[1440px] mx-auto">
            <div className="relative w-full h-[450px] md:h-[500px] rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://thehappening.com/wp-content/uploads/2024/07/fw24-lightspray-other-product-still-rgb-25.jpg"
                alt="Urban Sneaker"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-16">
                <div className="max-w-2xl">
                  <span className="text-primary-esmeralda font-bold text-xs md:text-sm tracking-widest uppercase mb-4 block">
                    Nueva Edición Limitada
                  </span>
                  <h2 className="text-white text-4xl md:text-6xl font-extrabold font-headline leading-none mb-6">
                    Urban Sneaker <br /> Revolution
                  </h2>
                  <p className="text-gray-200 text-sm md:text-base max-w-lg mb-8 leading-relaxed">
                    Diseño audaz para el explorador urbano. Experimenta el confort supremo fusionado con la estética de vanguardia.
                  </p>
                  <div className="flex flex-wrap items-center gap-6">
                    <button className="bg-primary-esmeralda text-white px-8 py-3 rounded-lg font-bold hover:bg-primary transition-colors">
                      Explorar colección
                    </button>
                    <button className="text-white font-bold flex items-center gap-2 group">
                      Ver catálogo
                      <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_right_alt</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tendencias */}
        <section className="pb-20 px-6 md:px-16 bg-[#F8F9FA]">
          <div className="max-w-[1440px] mx-auto text-center mb-12">
            <span className="text-[12px] font-bold tracking-[0.2em] uppercase text-gray-500 block mb-2">Tendencias 2026</span>
            <h2 className="text-3xl md:text-4xl font-black font-headline text-slate-900">Estilo para cada día</h2>
          </div>
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[700px]">
            <div className="md:col-span-7 relative rounded-3xl overflow-hidden group shadow-lg">
              <img
                src="https://images.pexels.com/photos/29493395/pexels-photo-29493395/free-photo-of-modelado-en-nieve.jpeg"
                alt="Otoño Invierno"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-8 md:p-12 text-white">
                <h3 className="text-3xl md:text-4xl font-bold mb-2">Colección otoño/invierno</h3>
                <p className="text-gray-200 text-sm mb-6 max-w-sm">Piezas atemporales diseñadas para durar.</p>
                <a href="#" className="inline-block border-b-2 border-white pb-1 font-bold text-sm text-white hover:text-primary-esmeralda hover:border-primary-esmeralda transition-all">Ver prendas</a>
              </div>
            </div>
            <div className="md:col-span-5 flex flex-col gap-6">
              <div className="relative flex-1 rounded-3xl overflow-hidden group shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?q=80&w=1000&auto=format&fit=crop"
                  alt="Básicos"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-primary/20 group-hover:bg-primary/40 transition-colors"></div>
                <div className="absolute bottom-0 left-0 p-8 text-white">
                  <h3 className="text-xl md:text-2xl font-bold mb-1">Básicos modernos</h3>
                  <p className="text-gray-200 text-xs">$300 - $500</p>
                  <a href="#" className="inline-block border-b-2 border-white pb-1 font-bold text-sm text-white hover:text-primary-esmeralda hover:border-primary-esmeralda transition-all">Ver prendas</a>
                </div>
              </div>
              <div className="relative flex-1 rounded-3xl overflow-hidden group shadow-lg">
                <img
                  src="https://images.unsplash.com/photo-1547949003-9792a18a2601?q=80&w=1000&auto=format&fit=crop"
                  alt="Accesorios"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
                <div className="absolute bottom-0 left-0 p-8 text-white">
                  <h3 className="text-xl md:text-2xl font-bold mb-1">Accesorios premium</h3>
                  <p className="text-gray-200 text-xs">Desde $500</p>
                  <a href="#" className="inline-block border-b-2 border-white pb-1 font-bold text-sm text-white hover:text-primary-esmeralda hover:border-primary-esmeralda transition-all">Ver articulos</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tecnología */}
        <section className="pb-20 px-6 md:px-16 bg-[#F8F9FA]">
          <div className="max-w-[1440px] mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-center mb-12 text-slate-900 tracking-tight">Lo más buscado en tecnología</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 h-auto">
              {techTrends.map((tech, index) => (
                <div key={index} className="relative h-[300px] md:h-[350px] rounded-2xl overflow-hidden group cursor-pointer shadow-md">
                  <img
                    src={tech.img}
                    alt={tech.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300"></div>
                  <div className="absolute inset-0 p-6 flex flex-col justify-end items-start text-white">
                    <h3 className="text-2xl font-bold leading-tight">{tech.title}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Home;
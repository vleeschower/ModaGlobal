import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom'; // <-- IMPORTANTE
import Header from '../components/header'; 
import Footer from '../components/footer';
import ProductCard from '../components/ProductCard';
import FilterSidebar from '../components/FilterSidebar';
import { type Producto } from '../types/Producto';
import { apiService } from '../services/ApiService';
import { useAuth } from '../context/AuthContext'; // <-- Traemos la autenticación

const Catalogo: React.FC = () => {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [paginaActual, setPaginaActual] = useState<number>(1);
    const [totalPaginas, setTotalPaginas] = useState<number>(1);
    const limitePorPagina = 12;

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todas');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const { isAdmin } = useAuth(); // <-- Obtenemos si es Admin

    useEffect(() => {
        const fetchProductos = async () => {
            setLoading(true);
            setError(null);
            const response = await apiService.getProductos(paginaActual, limitePorPagina);
            if (response.success && response.data && response.meta) {
                setProductos(response.data);
                setTotalPaginas(response.meta.total_paginas);
            } else {
                setError(response.message || 'Error desconocido al cargar productos.');
            }
            setLoading(false);
        };
        fetchProductos();
    }, [paginaActual]);

    const categories = useMemo(() => {
        const uniques = new Set(productos.map(p => p.nombre_categoria || 'Sin Categoría'));
        return Array.from(uniques);
    }, [productos]);

    const filteredProducts = useMemo(() => {
        return productos.filter(product => {
            const categoryMatch = selectedCategory === 'Todas' || (product.nombre_categoria || 'Sin Categoría') === selectedCategory;
            const searchMatch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                (product.descripcion?.toLowerCase() || '').includes(searchTerm.toLowerCase());
            return categoryMatch && searchMatch;
        });
    }, [selectedCategory, searchTerm, productos]);

    const next_page = () => { if (paginaActual < totalPaginas) setPaginaActual(p => p + 1); };
    const prev_page = () => { if (paginaActual > 1) setPaginaActual(p => p - 1); };

    return (
        <div className="bg-white min-h-screen flex flex-col font-sans">
            <Header toggleSidebar={toggleSidebar} />

            <main className="grow max-w-1440px mx-auto w-full px-6 md:px-16 py-12">
                {/* ENCABEZADO CON BOTÓN DE ADMIN */}
                <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
                    <Link to="/" className="hover:text-emerald-500 transition-colors">Inicio</Link>
                    <span>/</span>
                    <Link to="/catalogo" className="hover:text-emerald-500 transition-colors">Catálogo</Link>
                </nav>
                <div className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Nuestro Catálogo</h1>
                        <p className="text-gray-500 mt-2 text-lg">Descubre tecnología, hogar y más.</p>
                    </div>
                    
                    {/* Botón exclusivo para Admins */}
                    {isAdmin && (
                        <Link to="/admin/producto/nuevo" className="bg-gray-100 text-gray-600 font-bold px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition-colors flex items-center gap-2">
                            {/* SVG de suma (+) */}
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                            Agregar Producto
                        </Link>
                    )}
                </div>

                <div className="flex flex-col md:flex-row gap-12">
                    <FilterSidebar categories={categories} selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} searchTerm={searchTerm} onSearchChange={setSearchTerm} />

                    <div className="flex-1 flex flex-col">
                        <div className="mb-6 flex justify-between items-center pb-4 border-b border-gray-100">
                            <span className="text-sm font-medium text-gray-500">
                                Mostrando <strong className="text-slate-900">{filteredProducts.length}</strong> productos en esta página
                            </span>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-32">
                                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="mt-4 text-gray-500 font-medium">Cargando catálogo...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-3xl border border-red-100 text-red-600">
                                <span className="material-symbols-outlined text-4xl mb-2">error</span>
                                <p className="font-bold">{error}</p>
                            </div>
                        ) : filteredProducts.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredProducts.map(product => (
                                        <ProductCard key={product.id_producto} product={product} />
                                    ))}
                                </div>
                                {totalPaginas > 1 && (
                                    <div className="mt-12 pt-6 border-t border-gray-100 flex items-center justify-between">
                                        <button onClick={prev_page} disabled={paginaActual === 1} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-slate-800">
                                            <span className="material-symbols-outlined text-sm">arrow_back</span> Anterior
                                        </button>
                                        <span className="text-sm text-gray-500 font-medium">Página {paginaActual} de {totalPaginas}</span>
                                        <button onClick={next_page} disabled={paginaActual === totalPaginas} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 text-slate-800">
                                            Siguiente <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">inventory_2</span>
                                <h3 className="text-xl font-bold text-slate-700">No encontramos resultados</h3>
                                <p className="text-gray-500 mt-2 text-center max-w-md">No hay productos que coincidan en esta página.</p>
                                <button onClick={() => { setSearchTerm(''); setSelectedCategory('Todas'); }} className="mt-6 bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-500 transition-colors">
                                    Limpiar filtros
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default Catalogo;
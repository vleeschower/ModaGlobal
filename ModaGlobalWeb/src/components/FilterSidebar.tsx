// src/components/FilterSidebar.tsx
import React from 'react';

interface FilterSidebarProps {
    categories: string[];
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
    searchTerm: string;
    onSearchChange: (term: string) => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ 
    categories, selectedCategory, onSelectCategory, searchTerm, onSearchChange 
}) => {
    return (
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-8">
            {/* Buscador con SVG Nativo */}
            <div>
                <h3 className="font-bold text-lg mb-3 text-slate-800">Buscar</h3>
                <div className="relative group">
                    {/* SVG de lupa que NUNCA va a fallar */}
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        strokeWidth={2.5} 
                        stroke="currentColor" 
                        className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none select-none transition-colors group-focus-within:text-emerald-500"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>

                    <input 
                        type="text" 
                        placeholder="¿Qué buscas hoy?" 
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-gray-300 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all text-slate-700 placeholder:text-gray-400"
                    />
                </div>
            </div>

            {/* Categorías */}
            <div>
                <h3 className="font-bold text-lg mb-3 text-slate-800">Categorías</h3>
                <div className="flex flex-col gap-1">
                    <button 
                        onClick={() => onSelectCategory('Todas')}
                        className={`text-left px-4 py-2.5 rounded-lg transition-colors font-medium ${selectedCategory === 'Todas' ? 'bg-emerald-500/10 text-emerald-600' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Todas las categorías
                    </button>
                    {categories.map(cat => (
                        <button 
                            key={cat}
                            onClick={() => onSelectCategory(cat)}
                            className={`text-left px-4 py-2.5 rounded-lg transition-colors font-medium ${selectedCategory === cat ? 'bg-emerald-500/10 text-emerald-600' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
        </aside>
    );
};

export default FilterSidebar;
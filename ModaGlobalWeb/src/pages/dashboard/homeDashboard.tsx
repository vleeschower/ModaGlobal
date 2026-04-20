import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/dashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
  trend?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <span className="material-symbols-outlined text-white text-2xl">{icon}</span>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <span className="material-symbols-outlined text-sm">{trend >= 0 ? 'trending_up' : 'trending_down'}</span>
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl md:text-3xl font-bold text-gray-800">{value}</p>
    </div>
  );
};

const DashboardHome: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalOrders: 0
  });

  const currentUserRole = currentUser?.rol || '';

  useEffect(() => {
    // Simular carga de datos
    setTimeout(() => {
      setStats({
        totalProducts: 3456,
        totalSales: 89234,
        totalOrders: 567
      });
      setLoading(false);
    }, 1000);
  }, []);

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getRoleBadge = () => {
    switch (currentUserRole) {
      case 'SuperAdministrador':
        return 'bg-purple-100 text-purple-700';
      case 'Administrador':
        return 'bg-primary-esmeralda/10 text-primary-esmeralda';
      case 'Cajero':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getRoleText = () => {
    switch (currentUserRole) {
      case 'SuperAdministrador':
        return 'Super Administrador';
      case 'Administrador':
        return 'Administrador';
      case 'Cajero':
        return 'Cajero';
      default:
        return 'Usuario';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Header de Bienvenida */}
        <section className="bg-gradient-to-r from-primary to-primary-esmeralda rounded-2xl p-6 md:p-8 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-white/80 text-sm mb-1">{getWelcomeMessage()}</p>
              <h1 className="text-2xl md:text-3xl font-bold">
                {currentUser?.nombre}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getRoleBadge()}`}>
                  {getRoleText()}
                </span>
                <span className="text-white/60 text-xs">
                  Último acceso: Hoy, {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Tarjetas de Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <StatCard 
            title="Productos" 
            value={loading ? '...' : stats.totalProducts.toLocaleString()} 
            icon="inventory_2" 
            color="bg-emerald-500"
          />
          <StatCard 
            title="Ventas Totales" 
            value={loading ? '...' : `$${stats.totalSales.toLocaleString()}`} 
            icon="attach_money" 
            color="bg-amber-500"
          />
          <StatCard 
            title="Pedidos" 
            value={loading ? '...' : stats.totalOrders.toLocaleString()} 
            icon="shopping_cart" 
            color="bg-purple-500"
          />
        </div>

        {/* Acciones Rápidas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-primary mb-4">Acciones rápidas</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-4">
            
            <Link 
              to="/inventario"
              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-all">
                <span className="material-symbols-outlined text-emerald-600 text-2xl">inventory_2</span>
              </div>
              <span className="text-sm font-medium text-gray-700">Gestionar inventario</span>
            </Link>
            
            <Link 
              to="/catalogo"
              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-gray-50 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-all">
                <span className="material-symbols-outlined text-amber-600 text-2xl">category</span>
              </div>
              <span className="text-sm font-medium text-gray-700">Catálogo</span>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardHome;
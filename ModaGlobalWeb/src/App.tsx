import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/login';
import Register from './pages/register';
import Home from "./pages/home";
import DashboardUsuarios from './pages/dashboard/usuarios/usuarios';
import HomeDashboard from './pages/dashboard/homeDashboard';
import PerfilDashboard from './pages/dashboard/usuarios/miPerfil';
import Inventario from './pages/inventario';
import Catalogo from './pages/Catalogo';
import ProductDetails from './pages/ProductDetails';
import ProductManager from './pages/ProductManager';
import Profile from "./pages/PerfilCliente";
import { CartProvider } from './context/CartContext';
import Cart from './pages/Cart';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* Redirección de raíz */}
            <Route path="/" element={<Navigate to="/home" replace />} />
            
            {/* Rutas públicas - cualquiera puede acceder */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/home" element={<Home />} />

            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/producto/:id" element={<ProductDetails />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/admin/producto/nuevo" element={<ProductManager />} />
            <Route path="/admin/producto/editar/:id" element={<ProductManager />} />
            <Route path="/carrito" element={<Cart />} />

            {/* Ruta de perfil - solo para clientes autenticados */}
            <Route path="/perfil" element={
              <ProtectedRoute allowedRoles={['Cliente']}>
                <Profile />
              </ProtectedRoute>
            } />
            
            {/* Rutas protegidas - solo para administradores y cajeros */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['SuperAdministrador', 'Administrador', 'Cajero']}>
                <HomeDashboard />
              </ProtectedRoute>
            } />

            <Route path="/dashboard/users" element={
              <ProtectedRoute allowedRoles={['SuperAdministrador', 'Administrador', 'Cajero']}>
                <DashboardUsuarios />
              </ProtectedRoute>
            } />

            <Route path="/dashboard/perfil" element={
              <ProtectedRoute allowedRoles={['SuperAdministrador', 'Administrador', 'Cajero']}>
                <PerfilDashboard />
              </ProtectedRoute>
            } />

          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
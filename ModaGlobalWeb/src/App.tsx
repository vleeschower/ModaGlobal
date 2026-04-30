import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext'; // Viene de la rama de Rogelio
import ProtectedRoute from './components/ProtectedRoute';

// Páginas Públicas
import Login from './pages/login';
import Register from './pages/register';
import Home from "./pages/home";
import Catalogo from './pages/Catalogo';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart'; // Viene de la rama de Rogelio

// Páginas de Cliente
import Profile from "./pages/PerfilCliente";

// Páginas de Dashboard (Staff)
import HomeDashboard from './pages/dashboard/homeDashboard';
import DashboardUsuarios from './pages/dashboard/usuarios/usuarios';
import PerfilDashboard from './pages/dashboard/usuarios/miPerfil';
import AdminProductList from './pages/dashboard/AdminProductList'; // Recuperado de tu rama
import ProductManager from './pages/ProductManager';
import PromocionesAdmin from './pages/dashboard/PromocionesAdmin';
import Inventario from './pages/inventario';
import SolicitudesStock from './pages/dashboard/SolicitudesStock';
import TiendasDashboard from './pages/dashboard/TiendasDashboard';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            {/* ========================================== */}
            {/* 1. RUTAS PÚBLICAS (Cualquiera puede acceder) */}
            {/* ========================================== */}
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/home" element={<Home />} />
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/producto/:id" element={<ProductDetails />} />
            
            {/* Ruta del carrito (Rogelio) */}
            <Route path="/carrito" element={<Cart />} />

            {/* ========================================== */}
            {/* 2. RUTAS DE CLIENTE (Compradores)          */}
            {/* ========================================== */}
            <Route path="/perfil" element={
              <ProtectedRoute allowedRoles={['Cliente']}>
                <Profile />
              </ProtectedRoute>
            } />
            
            {/* ========================================== */}
            {/* 3. RUTAS DE DASHBOARD (Todo el Staff)      */}
            {/* ========================================== */}
            <Route path="/dashboard" element={
              <ProtectedRoute allowedRoles={['SuperAdministrador', 'Administrador', 'Cajero']}>
                <HomeDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard/perfil" element={
              <ProtectedRoute allowedRoles={['SuperAdministrador', 'Administrador', 'Cajero']}>
                <PerfilDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard/users" element={
              <ProtectedRoute allowedRoles={['SuperAdministrador', 'Administrador', 'Cajero']}>
                <DashboardUsuarios />
              </ProtectedRoute>
            } />

            <Route path="/dashboard/inventario" element={
              <ProtectedRoute allowedRoles={['SuperAdministrador', 'Administrador', 'Cajero']}>
                <Inventario />
              </ProtectedRoute>
            } />

            {/* ========================================== */}
            {/* 4. RUTAS DE GESTIÓN (SuperAdmin y Admin)   */}
            {/* ========================================== */}
            <Route path="/dashboard/productos" element={
              <ProtectedRoute allowedRoles={['SuperAdministrador', 'Administrador']}>
                <AdminProductList />
              </ProtectedRoute>
            } />

            <Route path="/dashboard/promociones" element={
              <ProtectedRoute allowedRoles={['SuperAdministrador', 'Administrador']}>
                <PromocionesAdmin />
              </ProtectedRoute>
            } />

            <Route path="/dashboard/solicitudes" element={
              <ProtectedRoute allowedRoles={['SuperAdministrador', 'Administrador']}>
                <SolicitudesStock />
              </ProtectedRoute>
            } />

            <Route path="/dashboard/tiendas" element={
              <ProtectedRoute allowedRoles={['SuperAdministrador', 'Administrador']}>
                <TiendasDashboard />
              </ProtectedRoute>
            } />

            {/* ========================================== */}
            {/* 5. RUTAS EXCLUSIVAS DE SEDE CENTRAL        */}
            {/* ========================================== */}
            {/* SOLO el SuperAdministrador puede modificar el catálogo maestro */}
            <Route path="/admin/producto/nuevo" element={
              <ProtectedRoute allowedRoles={['SuperAdministrador']}>
                <ProductManager />
              </ProtectedRoute>
            } />
            
            <Route path="/admin/producto/editar/:id" element={
              <ProtectedRoute allowedRoles={['SuperAdministrador']}>
                <ProductManager />
              </ProtectedRoute>
            } />

          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
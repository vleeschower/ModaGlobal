import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/ProtectedRoute';

// Páginas Públicas
import Login from './pages/login';
import Register from './pages/register';
import Home from "./pages/home";
import Catalogo from './pages/Catalogo';
import ProductDetails from './pages/ProductDetails';

// Páginas de Cliente
import Profile from "./pages/PerfilCliente";
import Cart from './pages/Cart';

// Páginas de Dashboard (Staff)
import HomeDashboard from './pages/dashboard/homeDashboard';
import DashboardUsuarios from './pages/dashboard/usuarios/usuarios';
import PerfilDashboard from './pages/dashboard/usuarios/miPerfil';
import Inventario from './pages/inventario';
import ProductManager from './pages/ProductManager';

// Nota: Si tu amigo agregó AdminProductList, asegúrate de tener el archivo, 
// si no, puedes comentar la importación.
// import AdminProductList from './pages/dashboard/AdminProductList';

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
            
            {/* Nuestra ruta del carrito */}
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
            {/* 4. RUTAS EXCLUSIVAS DE GESTIÓN             */}
            {/* ========================================== */}
            
            {/* SOLO el SuperAdministrador puede gestionar el catálogo maestro */}
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
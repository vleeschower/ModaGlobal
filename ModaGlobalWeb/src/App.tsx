import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from "./pages/login";
import Register from './pages/register';
import Home from "./pages/home";
import DashboardUsuarios from './pages/dashboard/usuarios';
import Inventario from './pages/inventario';
import Catalogo from './pages/Catalogo';
import ProductDetails from './pages/ProductDetails';
import { AuthProvider } from './context/AuthContext';
import ProductManager from './pages/ProductManager';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
      
          <Route path="/" element={<Navigate to="/home" />} />
          
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<Home />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/dashboard/users" element={<DashboardUsuarios />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/producto/:id" element={<ProductDetails />} />
          <Route path="/admin/producto/nuevo" element={<ProductManager />} />
          <Route path="/admin/producto/editar/:id" element={<ProductManager />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
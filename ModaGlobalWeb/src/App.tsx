import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from "./pages/login";
import Register from './pages/register';
import Home from "./pages/home";
import DashboardUsuarios from './pages/dashboard/usuarios';
import Inventario from './pages/inventario';

function App() {
  return (
    <BrowserRouter>
      <Routes>
     
        <Route path="/" element={<Navigate to="/home" />} />
        
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/home" element={<Home />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/dashboard/users" element={<DashboardUsuarios />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
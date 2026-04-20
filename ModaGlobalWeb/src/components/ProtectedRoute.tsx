// components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si se especificaron roles permitidos, verificarlos
  if (allowedRoles && user && !allowedRoles.includes(user.rol)) {
    // Si no tiene el rol permitido, redirigir según su rol
    if (user.rol === 'Cliente') {
      return <Navigate to="/" replace />;
    }
    // Si es Admin, SuperAdmin o Cajero, va al dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
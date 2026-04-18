// components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { userService } from '../services/UserService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const isAuthenticated = userService.isAuthenticated();
  const currentUser = userService.getCurrentUser();

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.rol)) {
    // Si no tiene el rol permitido, redirigir según su rol
    if (currentUser.rol === 'cliente') {
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/dashboard/users" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
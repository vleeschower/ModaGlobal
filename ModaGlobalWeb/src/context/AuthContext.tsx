import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode'; // npm install jwt-decode

interface User {
  id: string;
  rol: 'Cliente' | 'Admin' | 'SuperAdmin';
  nombre: string;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Leemos el token que tenemos en el .env (para pruebas) o LocalStorage
    const token = import.meta.env.VITE_TEMP_AUTH_TOKEN || localStorage.getItem('modaglobal_jwt');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUser({ id: decoded.id, rol: decoded.rol, nombre: decoded.nombre });
      } catch (e) {
        console.error("Token inválido");
      }
    }
  }, []);

  const isAdmin = user?.rol === 'Admin' || user?.rol === 'SuperAdmin';
  const logout = () => { localStorage.removeItem('modaglobal_jwt'); setUser(null); };

  return (
    <AuthContext.Provider value={{ user, isAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};
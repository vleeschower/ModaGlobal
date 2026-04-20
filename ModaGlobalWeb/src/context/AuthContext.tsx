// context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { userService } from '../services/UserService';
import type { User } from '../services/UserService';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isCajero: boolean;
  isCliente: boolean;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Cargar usuario desde localStorage al iniciar
    const currentUser = userService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  const isAdmin = user?.rol === 'Administrador';
  const isSuperAdmin = user?.rol === 'SuperAdministrador';
  const isCajero = user?.rol === 'Cajero';
  const isCliente = user?.rol === 'Cliente';
  const isAuthenticated = !!user;

  const login = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('mg_token', token);
    localStorage.setItem('mg_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    userService.logout();
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('mg_user', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAdmin, 
      isSuperAdmin,
      isCajero,
      isCliente,
      isAuthenticated,
      login, 
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return context;
};
// context/AuthContext.tsx
import React, { createContext, useContext, useState } from 'react';
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
  
  // ✨ LA MAGIA ESTÁ AQUÍ: Inicialización Síncrona
  // Al pasarle una función al useState, React lee el localStorage en el 
  // milisegundo exacto en que se monta la app, ANTES de revisar las rutas.
  const [user, setUser] = useState<User | null>(() => {
    return userService.getCurrentUser();
  });

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
    userService.logout(); // Tu servicio ya limpia el localStorage y redirige
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
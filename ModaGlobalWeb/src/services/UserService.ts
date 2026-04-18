const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000';

// --- INTERFACES DE USUARIO ---
export interface User {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  rol: 'SuperAdministrador' | 'Administrador' | 'Cajero' | 'Cliente';
  created_at?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

export interface UsersResponse {
  success: boolean;
  users?: User[];
  message?: string;
}

export const userService = {
  /**
   * Envía las credenciales al Gateway, que redirige al microservicio de usuarios
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.token && data.user) {
        localStorage.setItem('mg_token', data.token);
        localStorage.setItem('mg_user', JSON.stringify(data.user));
      }

      return data;
    } catch (error) {
      console.error('[UserService] Error en login:', error);
      return { success: false, message: 'Error de conexión con el servidor.' };
    }
  },

  /**
   * Registra un nuevo usuario a través del Gateway
   * El Gateway inyecta automáticamente la API key
   */
  register: async (userData: Partial<User> & { password: string }): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/usuarios/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[UserService] Error en registro:', error);
      return { success: false, message: 'No se pudo completar el registro.' };
    }
  },

  /**
   * Obtener todos los usuarios (el backend filtra según el rol)
   */
  getAllUsers: async (): Promise<UsersResponse> => {
    try {
      const token = localStorage.getItem('mg_token');
      
      const response = await fetch(`${API_BASE_URL}/api/usuarios/users`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      return await response.json();
    } catch (error) {
      console.error('[UserService] Error al obtener usuarios:', error);
      return { success: false, message: 'Error al obtener la lista de usuarios' };
    }
  },

  /**
   * Actualizar un usuario
   */
  updateUser: async (id: string, userData: Partial<User>): Promise<AuthResponse> => {
    try {
      const token = localStorage.getItem('mg_token');
      
      const response = await fetch(`${API_BASE_URL}/api/usuarios/users/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData),
      });

      return await response.json();
    } catch (error) {
      console.error('[UserService] Error al actualizar usuario:', error);
      return { success: false, message: 'Error al actualizar el usuario' };
    }
  },

  /**
   * Eliminar un usuario (soft delete)
   */
  deleteUser: async (id: string): Promise<AuthResponse> => {
    try {
      const token = localStorage.getItem('mg_token');
      
      const response = await fetch(`${API_BASE_URL}/api/usuarios/users/${id}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      return await response.json();
    } catch (error) {
      console.error('[UserService] Error al eliminar usuario:', error);
      return { success: false, message: 'Error al eliminar el usuario' };
    }
  },

  /**
   * Obtener usuario por ID
   */
  getUserById: async (id: string): Promise<AuthResponse> => {
    try {
      const token = localStorage.getItem('mg_token');
      
      const response = await fetch(`${API_BASE_URL}/api/usuarios/users/${id}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      return await response.json();
    } catch (error) {
      console.error('[UserService] Error al obtener usuario:', error);
      return { success: false, message: 'Error al obtener el usuario' };
    }
  },


  /**
   * Cerrar sesión
   */
  logout: (): void => {
    localStorage.removeItem('mg_token');
    localStorage.removeItem('mg_user');
    window.location.href = '/login';
  },

  /**
   * Obtener usuario actual del localStorage
   */
  getCurrentUser: (): User | null => {
    const userJson = localStorage.getItem('mg_user');
    return userJson ? JSON.parse(userJson) : null;
  },

  /**
   * Verificar si está autenticado
   */
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('mg_token');
  }
};
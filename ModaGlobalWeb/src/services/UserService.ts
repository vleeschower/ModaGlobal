// services/UserService.tsx
const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:3000';

// --- INTERFACES DE USUARIO ---
export interface User {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  rol: 'SuperAdministrador' | 'Administrador' | 'Cajero' | 'Cliente';
    id_tienda?: string;
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

export interface UpdateProfileData {
  nombre: string;
  email: string;
  telefono?: string;
}

export const userService = {
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

  // ✅ NUEVO: Registrar usuario por admin
  registerByAdmin: async (userData: Partial<User> & { password: string; rol_nombre: string; id_tienda?: string }): Promise<AuthResponse> => {
    try {
      const token = localStorage.getItem('mg_token');
      
      const response = await fetch(`${API_BASE_URL}/api/usuarios/admin/users`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData),
      });

      return await response.json();
    } catch (error) {
      console.error('[UserService] Error en registro por admin:', error);
      return { success: false, message: 'No se pudo completar el registro.' };
    }
  },

  /**
   * Actualizar perfil de usuario con validaciones incluidas
   */
  updateProfile: async (id: string, data: UpdateProfileData): Promise<AuthResponse> => {
    // Validaciones antes de enviar al backend
    if (!data.nombre || !data.nombre.trim()) {
      return { success: false, message: 'El nombre no puede estar vacío' };
    }

    if (!data.email || !data.email.trim()) {
      return { success: false, message: 'El correo electrónico no puede estar vacío' };
    }

    // Validar formato de email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(data.email)) {
      return { success: false, message: 'Formato de correo electrónico inválido' };
    }

    // Validar nombre (solo letras, espacios, mínimo 2 caracteres)
    const nombreRegex = /^[a-zA-ZáéíóúñÑüÜ\s]{2,100}$/;
    if (!nombreRegex.test(data.nombre.trim())) {
      return { success: false, message: 'El nombre debe tener al menos 2 caracteres y solo letras' };
    }

    // Validar teléfono si fue proporcionado (solo números, +, -, espacios)
    if (data.telefono && !/^[0-9+\-\s]{8,20}$/.test(data.telefono)) {
      return { success: false, message: 'Formato de teléfono inválido' };
    }

    try {
      const token = localStorage.getItem('mg_token');
      
      const response = await fetch(`${API_BASE_URL}/api/usuarios/users/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre: data.nombre.trim(),
          email: data.email.toLowerCase().trim(),
          telefono: data.telefono || null
        }),
      });

      return await response.json();
    } catch (error) {
      console.error('[UserService] Error al actualizar perfil:', error);
      return { success: false, message: 'Error de conexión con el servidor' };
    }
  },

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

  logout: (): void => {
    localStorage.removeItem('mg_token');
    localStorage.removeItem('mg_user');
    window.location.href = '/login';
  },

  getCurrentUser: (): User | null => {
    const userJson = localStorage.getItem('mg_user');
    return userJson ? JSON.parse(userJson) : null;
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('mg_token');
  }
};
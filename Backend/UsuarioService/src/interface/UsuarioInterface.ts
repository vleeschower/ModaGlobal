export interface IUsuario {
    id_usuario: string;
    nombre: string;
    email: string;
    password_hash: string;
    id_rol: string;
    created_at?: Date;
}

export interface AuthResponse {
    success: boolean;
    token?: string;
    user?: {
        id: string;
        nombre: string;
        email: string;
        rol: string;
    };
    message?: string;
}
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { poolPromise } from '../config/database';
import { logger } from '../utils/logger';
import sql from 'mssql';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("FATAL: JWT_SECRET no está configurado en las variables de entorno.");
    process.exit(1); 
}

const SALT_ROUNDS = 12;

// Registrar usuario (solo clientes)
export const registrarUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { nombre, email, password, telefono } = req.body;

        // Validaciones estrictas
        if (!nombre || !email || !password) {
            res.status(400).json({ success: false, message: 'Nombre, email y contraseña son requeridos' });
            return;
        }

        // Validar nombre (solo letras, espacios)
        const nombreRegex = /^[a-zA-ZáéíóúñÑüÜ\s]{2,100}$/;
        if (!nombreRegex.test(nombre.trim())) {
            res.status(400).json({ success: false, message: 'Nombre inválido (solo letras, mínimo 2 caracteres)' });
            return;
        }

        // Validar email
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({ success: false, message: 'Formato de email inválido' });
            return;
        }

        // Validar contraseña fuerte
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            res.status(400).json({ 
                success: false, 
                message: 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial' 
            });
            return;
        }

        const pool = await poolPromise;

        // Verificar email existente
        const checkUser = await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .query('SELECT id_usuario FROM usuarios WHERE email = @email AND deleted_at IS NULL');

        if (checkUser.recordset.length > 0) {
            res.status(409).json({ success: false, message: 'El correo ya está registrado' });
            return;
        }

        // Obtener ID del rol 'Cliente' (id_rol = 3)
        const roleResult = await pool.request()
            .input('nombre', sql.NVarChar, 'Cliente')
            .query('SELECT id_rol FROM roles WHERE nombre = @nombre');
        
        if (roleResult.recordset.length === 0) {
            res.status(500).json({ success: false, message: 'Error de configuración del sistema' });
            return;
        }

        const roleId = roleResult.recordset[0].id_rol;
        
        // Hash de contraseña
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        
        // Generar ID único
        const id_usuario = uuidv4();
        
        // Sanitizar inputs
        const sanitizedNombre = nombre.trim().replace(/[<>]/g, '');
        const sanitizedTelefono = telefono ? telefono.replace(/[^0-9+\-\s]/g, '').substring(0, 20) : null;

        // Insertar usuario
        await pool.request()
            .input('id_usuario', sql.VarChar(50), id_usuario)
            .input('nombre', sql.NVarChar(100), sanitizedNombre)
            .input('email', sql.NVarChar(100), email.toLowerCase())
            .input('password_hash', sql.NVarChar(255), passwordHash)
            .input('telefono', sql.VarChar(20), sanitizedTelefono)
            .input('id_rol', sql.Int, roleId)
            .query(`
                INSERT INTO usuarios (id_usuario, nombre, email, password_hash, telefono, id_rol, created_at) 
                VALUES (@id_usuario, @nombre, @email, @password_hash, @telefono, @id_rol, GETDATE())
            `);

        logger.info(`Usuario creado exitosamente: ${email}`);
        res.status(201).json({ success: true, message: 'Registro exitoso' });
        
    } catch (error) {
        logger.error('Error en registrarUsuario', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Registrar usuario por ADMIN (crea Admins, Cajeros)
export const registrarUsuarioPorAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { nombre, email, password, telefono, rol_nombre, id_tienda } = req.body;
        
        // Obtener usuario que está creando (desde headers del Gateway)
        const usuarioCreadorId = req.headers['x-user-id'] as string;
        const usuarioCreadorRol = req.headers['x-user-rol'] as string;

        // Validaciones básicas
        if (!nombre || !email || !password || !rol_nombre) {
            res.status(400).json({ 
                success: false, 
                message: 'Nombre, email, contraseña y rol son requeridos' 
            });
            return;
        }

        // ✅ REGLA: Solo SuperAdministrador puede crear SuperAdministradores
        if (rol_nombre === 'SuperAdministrador' && usuarioCreadorRol !== 'SuperAdministrador') {
            res.status(403).json({ 
                success: false, 
                message: 'No tienes permisos para crear un SuperAdministrador' 
            });
            return;
        }

        // ✅ REGLA: Administradores solo pueden crear Administradores y Cajeros
        if (usuarioCreadorRol === 'Administrador' && (rol_nombre !== 'Administrador' && rol_nombre !== 'Cajero')) {
            res.status(403).json({ 
                success: false, 
                message: 'Solo puedes crear Administradores o Cajeros' 
            });
            return;
        }

        // ✅ REGLA: NO se pueden crear clientes desde el dashboard
        if (rol_nombre === 'Cliente') {
            res.status(403).json({ 
                success: false, 
                message: 'Los clientes solo pueden registrarse desde la página pública' 
            });
            return;
        }

        // ✅ REGLA: Administradores y Cajeros DEBEN tener tienda asignada
        if ((rol_nombre === 'Administrador' || rol_nombre === 'Cajero') && !id_tienda) {
            res.status(400).json({ 
                success: false, 
                message: 'Los Administradores y Cajeros deben tener una tienda asignada' 
            });
            return;
        }

        // ✅ REGLA: SuperAdministradores NO deben tener tienda asignada
        if (rol_nombre === 'SuperAdministrador' && id_tienda) {
            res.status(400).json({ 
                success: false, 
                message: 'Los SuperAdministradores no pueden tener una tienda asignada' 
            });
            return;
        }

        // ✅ REGLA: Administradores solo pueden asignar su propia tienda
        if (usuarioCreadorRol === 'Administrador' && id_tienda) {
            const tiendaAdmin = req.headers['x-user-tienda-id'] as string;
            if (id_tienda !== tiendaAdmin) {
                res.status(403).json({ 
                    success: false, 
                    message: 'Solo puedes asignar usuarios a tu propia tienda' 
                });
                return;
            }
        }

        // Validar formato de email
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({ success: false, message: 'Formato de email inválido' });
            return;
        }

        // Validar contraseña
        if (password.length < 6) {
            res.status(400).json({ 
                success: false, 
                message: 'La contraseña debe tener al menos 6 caracteres' 
            });
            return;
        }

        const pool = await poolPromise;

        // Verificar si el email ya existe
        const checkUser = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT id_usuario FROM usuarios WHERE email = @email AND deleted_at IS NULL');

        if (checkUser.recordset.length > 0) {
            res.status(409).json({ success: false, message: 'El correo ya está registrado' });
            return;
        }

        // Obtener el ID del rol por su nombre
        const roleResult = await pool.request()
            .input('nombre', sql.NVarChar, rol_nombre)
            .query('SELECT id_rol FROM roles WHERE nombre = @nombre');
        
        if (roleResult.recordset.length === 0) {
            res.status(400).json({ success: false, message: 'Rol inválido' });
            return;
        }

        const roleId = roleResult.recordset[0].id_rol;
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const id_usuario = uuidv4();
        const sanitizedNombre = nombre.trim().replace(/[<>]/g, '');
        const sanitizedTelefono = telefono ? telefono.replace(/[^0-9+\-\s]/g, '').substring(0, 20) : null;

        // Insertar usuario con id_tienda
        await pool.request()
            .input('id_usuario', sql.VarChar(50), id_usuario)
            .input('nombre', sql.NVarChar(100), sanitizedNombre)
            .input('email', sql.NVarChar(100), email.toLowerCase())
            .input('password_hash', sql.NVarChar(255), passwordHash)
            .input('telefono', sql.VarChar(20), sanitizedTelefono)
            .input('id_rol', sql.Int, roleId)
            .input('id_tienda', sql.VarChar(50), id_tienda || null)
            .query(`
                INSERT INTO usuarios (id_usuario, nombre, email, password_hash, telefono, id_rol, id_tienda, created_at) 
                VALUES (@id_usuario, @nombre, @email, @password_hash, @telefono, @id_rol, @id_tienda, GETDATE())
            `);

        // Registrar en auditoría
        const id_auditoria = uuidv4();
        await pool.request()
            .input('id_auditoria', sql.VarChar(50), id_auditoria)
            .input('id_usuario', sql.VarChar(50), usuarioCreadorId)
            .input('tabla_afectada', sql.NVarChar(100), 'usuarios')
            .input('id_registro_afectado', sql.VarChar(50), id_usuario)
            .input('accion', sql.VarChar(20), 'INSERT')
            .input('valores_nuevos', sql.NVarChar(sql.MAX), JSON.stringify({ nombre, email, rol_nombre, id_tienda }))
            .input('ip_origen', sql.VarChar(45), req.ip || 'unknown')
            .query(`
                INSERT INTO auditoria_usuarios 
                (id_auditoria, id_usuario, tabla_afectada, id_registro_afectado, accion, valores_nuevos, ip_origen, created_at) 
                VALUES 
                (@id_auditoria, @id_usuario, @tabla_afectada, @id_registro_afectado, @accion, @valores_nuevos, @ip_origen, GETDATE())
            `);

        logger.info(`Usuario creado por ${usuarioCreadorRol}: ${email} - Tienda: ${id_tienda || 'N/A'}`);
        res.status(201).json({ success: true, message: 'Usuario creado exitosamente', userId: id_usuario });
        
    } catch (error) {
        logger.error('Error en registrarUsuarioPorAdmin', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Login con seguridad (incluyendo id_tienda)
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        const ipOrigen = req.ip || req.socket.remoteAddress || 'unknown';

        if (!email || !password) {
            res.status(400).json({ success: false, message: 'Email y contraseña son requeridos' });
            return;
        }

        const pool = await poolPromise;

        const result = await pool.request()
            .input('email', sql.NVarChar, email.toLowerCase())
            .query(`
                SELECT 
                    u.id_usuario, 
                    u.nombre, 
                    u.email, 
                    u.password_hash, 
                    u.id_rol,
                    u.id_tienda,
                    r.nombre as rol_nombre
                FROM usuarios u
                INNER JOIN roles r ON u.id_rol = r.id_rol
                WHERE u.email = @email AND u.deleted_at IS NULL
            `);

        const user = result.recordset[0];
        const dummyHash = '$2a$12$' + crypto.randomBytes(31).toString('base64');
        
        if (!user) {
            await bcrypt.compare(password, dummyHash);
            res.status(401).json({ success: false, message: 'Credenciales inválidas' });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Credenciales inválidas' });
            return;
        }

        // Generar JWT con id_tienda
        const token = jwt.sign(
            { 
                id: user.id_usuario, 
                nombre: user.nombre,
                email: user.email,
                rol: user.rol_nombre,
                id_tienda: user.id_tienda,
                jti: crypto.randomBytes(16).toString('hex')
            },
            JWT_SECRET,
            { 
                expiresIn: '12h',
                issuer: 'modaglobal-auth',
                audience: 'modaglobal-api'
            }
        );

        logger.info(`Login exitoso: ${user.email} - Rol: ${user.rol_nombre}`);

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user.id_usuario,
                nombre: user.nombre,
                email: user.email,
                rol: user.rol_nombre,
                id_tienda: user.id_tienda
            }
        });
        
    } catch (error) {
        logger.error('Error en login', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Obtener todos los usuarios (con filtro por tienda)
export const obtenerTodosUsuarios = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            res.status(401).json({ success: false, message: 'No autorizado' });
            return;
        }

        const decoded: any = jwt.verify(token, JWT_SECRET);
        const usuarioRol = decoded.rol;
        const usuarioTiendaId = decoded.id_tienda;

        const pool = await poolPromise;
        
        let query = `
            SELECT 
                u.id_usuario, 
                u.nombre, 
                u.email, 
                u.telefono, 
                u.id_rol,
                u.id_tienda,
                r.nombre as rol_nombre,
                u.created_at
            FROM usuarios u
            INNER JOIN roles r ON u.id_rol = r.id_rol
            WHERE u.deleted_at IS NULL
        `;
        
        // Filtrar según el rol del usuario logueado
        switch (usuarioRol) {
            case 'SuperAdministrador':
                // SuperAdmin ve todos los usuarios
                break;
            case 'Administrador':
                // Admin ve usuarios de su misma tienda (excepto SuperAdmins)
                query += ` AND u.id_tienda = @id_tienda`;
                query += ` AND r.nombre != 'SuperAdministrador'`;
                break;
            case 'Cajero':
                // Cajero solo ve Clientes de su tienda
                query += ` AND u.id_tienda = @id_tienda`;
                query += ` AND r.nombre = 'Cliente'`;
                break;
            default:
                res.status(403).json({ success: false, message: 'No tienes permisos para ver usuarios' });
                return;
        }
        
        query += ` ORDER BY u.created_at DESC`;
        
        const request = pool.request();
        if (usuarioTiendaId && (usuarioRol === 'Administrador' || usuarioRol === 'Cajero')) {
            request.input('id_tienda', sql.VarChar(50), usuarioTiendaId);
        }
        
        const result = await request.query(query);

        res.status(200).json({
            success: true,
            users: result.recordset.map(user => ({
                id: user.id_usuario,
                nombre: user.nombre,
                email: user.email,
                telefono: user.telefono,
                rol: user.rol_nombre,
                id_tienda: user.id_tienda,
                created_at: user.created_at
            }))
        });
    } catch (error) {
        logger.error('Error en obtenerTodosUsuarios', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Eliminar usuario (soft delete)
export const eliminarUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            res.status(401).json({ success: false, message: 'No autorizado' });
            return;
        }

        const decoded: any = jwt.verify(token, JWT_SECRET);
        
        const pool = await poolPromise;
        
        const userResult = await pool.request()
            .input('id', sql.VarChar, id)
            .query(`
                SELECT u.id_rol, r.nombre as rol_nombre 
                FROM usuarios u
                INNER JOIN roles r ON u.id_rol = r.id_rol
                WHERE u.id_usuario = @id AND u.deleted_at IS NULL
            `);
        
        if (userResult.recordset.length === 0) {
            res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            return;
        }
        
        const currentUserRol = userResult.recordset[0].rol_nombre;
        
        if (decoded.rol === 'Administrador' && currentUserRol === 'SuperAdministrador') {
            res.status(403).json({ success: false, message: 'No puedes eliminar un Super Administrador' });
            return;
        }
        
        await pool.request()
            .input('id', sql.VarChar, id)
            .query('UPDATE usuarios SET deleted_at = GETDATE() WHERE id_usuario = @id');
        
        logger.info(`Usuario eliminado: ${id} por ${decoded.email}`);
        res.status(200).json({ success: true, message: 'Usuario eliminado correctamente' });
        
    } catch (error) {
        logger.error('Error en eliminarUsuario', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Verificar token
export const verificarToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            res.status(401).json({ valid: false, message: 'Token no proporcionado' });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'modaglobal-auth',
            audience: 'modaglobal-api'
        });

        res.status(200).json({ valid: true, user: decoded });
    } catch (error) {
        res.status(401).json({ valid: false, message: 'Token inválido o expirado' });
    }
};

// Obtener usuario por ID
export const obtenerUsuarioPorId = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            res.status(401).json({ success: false, message: 'No autorizado' });
            return;
        }

        const decoded: any = jwt.verify(token, JWT_SECRET);
        
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.VarChar, id)
            .query(`
                SELECT 
                    u.id_usuario, 
                    u.nombre, 
                    u.email, 
                    u.telefono, 
                    u.id_rol,
                    u.id_tienda,
                    r.nombre as rol_nombre,
                    u.created_at
                FROM usuarios u
                INNER JOIN roles r ON u.id_rol = r.id_rol
                WHERE u.id_usuario = @id AND u.deleted_at IS NULL
            `);

        if (result.recordset.length === 0) {
            res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            return;
        }

        const user = result.recordset[0];
        
        if (decoded.rol === 'Administrador' && user.rol_nombre === 'SuperAdministrador') {
            res.status(403).json({ success: false, message: 'No tienes permisos para ver este usuario' });
            return;
        }

        res.status(200).json({
            success: true,
            user: {
                id: user.id_usuario,
                nombre: user.nombre,
                email: user.email,
                telefono: user.telefono,
                rol: user.rol_nombre,
                id_tienda: user.id_tienda,
                created_at: user.created_at
            }
        });
    } catch (error) {
        logger.error('Error en obtenerUsuarioPorId', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};

// Actualizar usuario
export const actualizarUsuario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { nombre, email, telefono } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            res.status(401).json({ success: false, message: 'No autorizado' });
            return;
        }

        const decoded: any = jwt.verify(token, JWT_SECRET);
        
        const pool = await poolPromise;
        
        const userResult = await pool.request()
            .input('id', sql.VarChar, id)
            .query(`
                SELECT u.id_rol, r.nombre as rol_nombre 
                FROM usuarios u
                INNER JOIN roles r ON u.id_rol = r.id_rol
                WHERE u.id_usuario = @id AND u.deleted_at IS NULL
            `);
        
        if (userResult.recordset.length === 0) {
            res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            return;
        }
        
        const currentUserRol = userResult.recordset[0].rol_nombre;
        
        if (decoded.rol === 'Administrador') {
            if (currentUserRol === 'SuperAdministrador') {
                res.status(403).json({ success: false, message: 'No puedes modificar un Super Administrador' });
                return;
            }
        }
        
        let updateQuery = 'UPDATE usuarios SET updated_at = GETDATE()';
        const updates: string[] = [];
        const request = pool.request();
        request.input('id', sql.VarChar, id);
        
        if (nombre) {
            updates.push('nombre = @nombre');
            request.input('nombre', sql.NVarChar, nombre.trim());
        }
        if (email) {
            updates.push('email = @email');
            request.input('email', sql.NVarChar, email.toLowerCase());
        }
        if (telefono !== undefined) {
            updates.push('telefono = @telefono');
            request.input('telefono', sql.VarChar, telefono);
        }
        
        if (updates.length === 0) {
            res.status(400).json({ success: false, message: 'No hay datos para actualizar' });
            return;
        }
        
        updateQuery += ', ' + updates.join(', ');
        updateQuery += ' WHERE id_usuario = @id';
        
        await request.query(updateQuery);
        
        logger.info(`Usuario actualizado: ${id} por ${decoded.email}`);
        res.status(200).json({ success: true, message: 'Usuario actualizado correctamente' });
        
    } catch (error) {
        logger.error('Error en actualizarUsuario', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};
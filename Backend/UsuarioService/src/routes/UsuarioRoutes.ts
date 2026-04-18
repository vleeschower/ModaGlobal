// UsuarioService/src/routes/UsuarioRoutes.ts
import { Router } from 'express';
import { 
    registrarUsuario, 
    registrarUsuarioPorAdmin,
    login, 
    verificarToken,
    obtenerTodosUsuarios,
    obtenerUsuarioPorId,
    actualizarUsuario,
    eliminarUsuario
} from '../controllers/UsuarioController';
import { verificarAcceso } from '../middlewares/security';

const router = Router();

// Todas las rutas requieren API key
router.use(verificarAcceso);

// Rutas públicas
router.post('/register', registrarUsuario);
router.post('/login', login);

// Rutas protegidas (requieren token)
router.post('/admin/users', registrarUsuarioPorAdmin); // ← NUEVO: Crear usuarios por admin
router.get('/verify', verificarToken);
router.get('/users', obtenerTodosUsuarios);
router.get('/users/:id', obtenerUsuarioPorId);
router.put('/users/:id', actualizarUsuario);
router.delete('/users/:id', eliminarUsuario);

export default router;
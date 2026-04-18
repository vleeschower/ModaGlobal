import { Router } from 'express';
import { 
    registrarUsuario, 
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

// Rutas públicas (registro y login no requieren token)
router.post('/register', registrarUsuario);
router.post('/login', login);

// Rutas protegidas (requieren token)
router.get('/verify', verificarToken);
router.get('/users', obtenerTodosUsuarios);
router.get('/users/:id', obtenerUsuarioPorId);
router.put('/users/:id', actualizarUsuario);
router.delete('/users/:id', eliminarUsuario);

export default router;
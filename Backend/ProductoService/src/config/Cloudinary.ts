import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import path from 'path';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ESTRATEGIA DE SEGURIDAD 1: Validación de Formatos y Destino
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        return {
            
        allowed_formats: ['jpg', 'png', 'webp', 'jpeg'], // Solo formatos visuales
        transformation: [{ width: 800, height: 800, crop: 'limit' }], // Redimensionar para ahorrar espacio
        public_id: `prod-${Date.now()}` // Nombre único para evitar sobreescritura
        };
    },
});

// ESTRATEGIA DE SEGURIDAD 2: Filtro de Archivos (Mime-Type Checking)
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    }
    // Si no es una imagen real, rechazamos de inmediato
    cb(new Error('Error: Solo se permiten imágenes (jpeg, jpg, png, webp)'));
};

export const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // ESTRATEGIA 3: Límite de 2MB para evitar ataques DoS
});
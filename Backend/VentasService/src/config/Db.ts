// src/config/db.ts
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/Logger';

// Instanciamos Prisma una sola vez para toda la aplicación
export const prisma = new PrismaClient();

// --- LA PRUEBA INOFENSIVA (HEALTHCHECK) ADAPTADA A PRISMA ---
export const probarConexion = async () => {
    try {
        // Hacemos una consulta inofensiva usando Prisma
        const result: any[] = await prisma.$queryRaw`SELECT GETDATE() AS hora_actual_azure, @@VERSION as version_sql`;
        
        logger.info('Ping a Azure exitoso. La base de datos de Ventas responde correctamente.', {
            horaAzure: result[0].hora_actual_azure,
            version: result[0].version_sql.substring(0, 30) + '...'
        });
    } catch (error) {
        logger.error('Falló el ping a la base de datos de Azure en Ventas.', error);
        process.exit(1); // Detenemos el microservicio si no hay BD
    }
};
import sql from 'mssql';
import dotenv from 'dotenv';
import { logger } from '../utils/Logger'; // Asumo que copiaste tu logger aquí también

dotenv.config();

const dbConfig: sql.config = {
    user: process.env.DB_USER as string,
    password: process.env.DB_PASSWORD as string,
    server: process.env.DB_SERVER as string,
    database: process.env.DB_NAME as string,
    options: {
        encrypt: true, // ¡OBLIGATORIO para conectarse a Azure!
        trustServerCertificate: false 
    }
};

// Mantenemos un "Pool" de conexiones abierto para no saturar la BD
const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        logger.info('Conexión establecida exitosamente con el Pool de Azure SQL.');
        return pool;
    })
    .catch(err => {
        logger.error('Error fatal al crear el Pool de conexión a Azure SQL', err);
        process.exit(1); // Si no hay BD, el microservicio debe detenerse
    });

export const getConnection = async () => {
    return await poolPromise;
};

// --- LA PRUEBA INOFENSIVA (HEALTHCHECK) ---
export const probarConexion = async () => {
    try {
        const pool = await getConnection();
        // Hacemos una consulta inofensiva al sistema
        const result = await pool.request().query('SELECT GETDATE() AS hora_actual_azure, @@VERSION as version_sql');
        
        logger.info('✅ Ping a Azure exitoso. La base de datos responde correctamente.', {
            horaAzure: result.recordset[0].hora_actual_azure,
            version: result.recordset[0].version_sql.substring(0, 30) + '...'
        });
    } catch (error) {
        logger.error('❌ Falló el ping a la base de datos de Azure.', error);
    }
};
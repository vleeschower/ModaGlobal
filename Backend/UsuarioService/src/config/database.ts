import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

export const dbConfig: sql.config = {
    user: process.env.DB_USER || 'Pruebas',
    password: process.env.DB_PASSWORD || 'Prue12345',
    server: process.env.DB_SERVER || 'modaglobalserver.database.windows.net',
    database: process.env.DB_NAME || 'modaglobal_usuarios',
    options: {
        encrypt: true, 
        trustServerCertificate: false
    }
};

export const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('[DB] Conectado a Azure SQL: ' + process.env.DB_NAME);
        return pool;
    })
    .catch(err => {
        console.error('[DB] Error:', err);
        throw err;
    });

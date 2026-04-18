import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

export const dbConfig: sql.config = {
    user: process.env.DB_USER as string,
    password: process.env.DB_PASSWORD as string,
    server: process.env.DB_SERVER as string,
    database: process.env.DB_NAME as string,
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

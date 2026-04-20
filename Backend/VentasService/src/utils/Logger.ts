// src/utils/Logger.ts
import winston from 'winston';
import path from 'path';

const forenseFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss[Z]' }),
    winston.format.json()
);

export const logger = winston.createLogger({
    level: 'info',
    format: forenseFormat,
    defaultMeta: { servicio: 'VentasService' },
    transports: [
        new winston.transports.File({ 
            filename: path.join(__dirname, '../../logs/ventas_evidencia.log'),
            level: 'info' 
        }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});
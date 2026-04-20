export const logger = {
    info: (message: string): void => {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
    },
    error: (message: string, err?: any): void => {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, err || '');
    }
};
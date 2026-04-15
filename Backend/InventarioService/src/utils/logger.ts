export const logger = {
    info: (message: string): void => {
        const timestamp = new Date().toISOString();
        console.log(`[INFO] ${timestamp} - ${message}`);
    },
    error: (message: string, err?: any): void => {
        const timestamp = new Date().toISOString();
        console.error(`[ERROR] ${timestamp} - ${message}`, err || '');
    }
};
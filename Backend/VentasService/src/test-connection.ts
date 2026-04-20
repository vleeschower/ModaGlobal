// src/test-connection.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Intentando conectar a Azure SQL...");
    
    // Ejecutamos una consulta basica para ver si el servidor responde
    const result = await prisma.$queryRaw`SELECT 1 as is_connected`;
    
    console.log("Conexion exitosa. La base de datos respondio:");
    console.dir(result);
    
    // Validamos que podamos leer la tabla Ventas
    const countVentas = await prisma.ventas.count();
    console.log(`Numero de registros en la tabla Ventas: ${countVentas}`);
    
  } catch (error) {
    console.error("Fallo la conexion a la base de datos. Detalles del error:");
    console.error(error);
  } finally {
    // Cerramos la conexion al terminar
    await prisma.$disconnect();
  }
}

main();
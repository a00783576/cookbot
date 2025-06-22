// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando el script de seeding...');

  // Datos del usuario de prueba
  const testUserId = '91dedc7f-6bc7-42e1-a4fa-5633268069f8';
  const testUserEmail = 'test@test.com';
  const testUserName = 'test';
  const createdAt = new Date('2025-06-21T17:37:29.246Z'); // Usa el formato ISO para fechas

  // Primero, intenta encontrar si el usuario ya existe para evitar duplicados
  const existingUser = await prisma.user.findUnique({
    where: { email: testUserEmail },
  });

  if (!existingUser) {
    // Si no existe, crea el usuario
    const user = await prisma.user.create({
      data: {
        id: testUserId, // Asegúrate de que tu modelo Prisma permite especificar el ID si es UUID
        email: testUserEmail,
        name: testUserName,
        createdAt: createdAt,
      },
    });
    console.log(`Usuario de prueba con ID: ${user.id} y email: ${user.email} creado.`);
  } else {
    console.log(`Usuario de prueba con email: ${existingUser.email} ya existe. Saltando creación.`);
  }

  // Puedes añadir más inserciones de datos aquí si lo necesitas
  // Ejemplo: await prisma.recipe.createMany({ data: [...] });

  console.log('Script de seeding finalizado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

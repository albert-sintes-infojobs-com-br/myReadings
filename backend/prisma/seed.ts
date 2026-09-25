import { PrismaClient } from '@prisma/client';
import { scryptSync, randomBytes } from 'crypto';

// Hash sin dependencias nativas (portable entre Windows y contenedores Linux)
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const prisma = new PrismaClient();

async function main() {
  // Idempotencia: limpiar en cascada desde las hojas
  await prisma.notification.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.rewardRequest.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.book.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const hash = hashPassword('password123');

  const parent = await prisma.user.create({
    data: { name: 'María García', email: 'maria@familia.dev', passwordHash: hash, role: 'PARENT', gender: 'FEMALE' },
  });
  const lucas = await prisma.user.create({
    data: { name: 'Lucas García', email: 'lucas@familia.dev', passwordHash: hash, role: 'CHILD', gender: 'MALE', parentId: parent.id },
  });
  const anais = await prisma.user.create({
    data: { name: 'Anaïs García', email: 'anais@familia.dev', passwordHash: hash, role: 'CHILD', gender: 'FEMALE', parentId: parent.id },
  });

  // Categorías
  const cFiccion = await prisma.category.create({
    data: { ownerUserId: lucas.id, title: 'Ficción', description: 'Novelas y cuentos', colorHex: '#4285f4' },
  });
  const cCiencia = await prisma.category.create({
    data: { ownerUserId: lucas.id, title: 'Ciencia', description: 'Libros divulgativos', colorHex: '#34a853' },
  });
  const cAventura = await prisma.category.create({
    data: { ownerUserId: anais.id, title: 'Aventura', colorHex: '#f4b400' },
  });
  const cFamilia = await prisma.category.create({
    data: { ownerUserId: parent.id, title: 'Familia', colorHex: '#ff6d3f' },
  });

  // Libros
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);
  const inDays = (d: number) => new Date(Date.now() + d * 86400000);

  await prisma.book.create({
    data: { ownerUserId: parent.id, title: 'Cien años de soledad', author: 'Gabriel García Márquez', status: 'FINISHED', startDate: daysAgo(30), endDate: daysAgo(12), rating: 5, categoryId: cFamilia.id, notes: 'Releído para conversar con los peques.' },
  });
  const elHobbit = await prisma.book.create({
    data: { ownerUserId: lucas.id, title: 'El Hobbit', author: 'J.R.R. Tolkien', status: 'FINISHED', startDate: daysAgo(45), endDate: daysAgo(30), rating: 4, categoryId: cFiccion.id },
  });
  const asombrosaHistoria = await prisma.book.create({
    data: { ownerUserId: lucas.id, title: 'La asombrosa historia del cuerpo humano', author: 'Talia Walker', status: 'READING', startDate: daysAgo(10), categoryId: cCiencia.id },
  });
  const dinosaurios = await prisma.book.create({
    data: { ownerUserId: lucas.id, title: 'Dinosaurios: guía ilustrada', author: 'DK', status: 'NOT_STARTED', categoryId: cCiencia.id },
  });
  await prisma.book.create({
    data: { ownerUserId: anais.id, title: 'La extraña carrera de Maximilian Bittner', author: 'Michael Zehl', status: 'READING', startDate: daysAgo(7), categoryId: cAventura.id, notes: 'Le falta por la mitad.' },
  });
  const piratas = await prisma.book.create({
    data: { ownerUserId: anais.id, title: 'Piratas del mar del sur', author: 'Germán Ors', status: 'NOT_STARTED', categoryId: cAventura.id },
  });

  // Meta de Lucas: 1.000 puntos -> videoconsola
  const metaConsola = await prisma.goal.create({
    data: {
      childId: lucas.id,
      createdByParentId: parent.id,
      name: 'Videoconsola',
      description: 'Cumplir metas de lectura para canjear una consola',
      targetPoints: 1000,
      status: 'ACTIVE',
    },
  });

  // Recompensa pendiente: 200 puntos por terminar 'Dinosaurios' antes de 30 días (liga a la meta)
  await prisma.reward.create({
    data: {
      bookId: dinosaurios.id,
      createdByParentId: parent.id,
      type: 'POINTS',
      value: 200,
      deadline: inDays(30),
      penaltyValue: 50,
      goalId: metaConsola.id,
      status: 'PENDING',
    },
  });

  // El Hobbit se cumplió: reward FULFILLED + ledger
  const rewardHobbit = await prisma.reward.create({
    data: {
      bookId: elHobbit.id,
      createdByParentId: parent.id,
      type: 'POINTS',
      value: 300,
      deadline: daysAgo(30),
      penaltyValue: 100,
      goalId: metaConsola.id,
      status: 'FULFILLED',
      resolvedAt: daysAgo(30),
    },
  });
  await prisma.ledgerEntry.create({
    data: { childId: lucas.id, rewardId: rewardHobbit.id, kind: 'POINTS', amount: 300, goalId: metaConsola.id, reason: 'FULFILLED' },
  });

  // Solicitud de recompensa de Anaïs sobre 'Piratas'
  await prisma.rewardRequest.create({
    data: { bookId: piratas.id, childId: anais.id, status: 'PENDING' },
  });

  // Notificaciones de ejemplo
  await prisma.notification.createMany({
    data: [
      { recipientUserId: parent.id, type: 'REWARD_REQUEST', refBookId: piratas.id, message: 'Anaïs ha solicitado una recompensa por "Piratas del mar del sur" y espera que la actives.' },
      { recipientUserId: lucas.id, type: 'REWARD_FULFILLED', refBookId: elHobbit.id, refRewardId: rewardHobbit.id, message: '¡Enhorabuena! "El Hobbit" terminado a tiempo: +300 puntos hacia "Videoconsola".', read: true },
      { recipientUserId: lucas.id, type: 'REWARD_REQUEST', refBookId: dinosaurios.id, message: 'Tienes una recompensa activa por terminar "Dinosaurios: guía ilustrada" antes del plazo (+200 pts).' },
    ],
  });

  console.log('Seed completado:');
  console.log(`  Padre : ${parent.email} / password123`);
  console.log(`  Hijos : ${lucas.email}, ${anais.email} / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

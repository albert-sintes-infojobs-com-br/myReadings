/**
 * Rolería del dominio (independiente del enum Prisma — el dominio no
 * importa de @prisma/client ni de @nestjs/*).
 */
export type Role = 'PARENT' | 'CHILD';

export type Gender = 'MALE' | 'FEMALE';

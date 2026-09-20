/**
 * Entidad de dominio: Libro.
 *
 * Sin dependencias de NestJS ni Prisma. Las fechas se representan como
 * strings ISO `YYYY-MM-DD` (igual que las envía/recibe la API) para que
 * el dominio no dependa de cómo Prisma tipa `@db.Date`.
 */
export type BookStatus = 'NOT_STARTED' | 'READING' | 'FINISHED';

export interface Book {
  id: number;
  ownerUserId: number;
  title: string;
  author: string;
  status: BookStatus;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  rating: number | null;
  categoryId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

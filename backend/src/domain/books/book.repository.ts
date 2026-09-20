import type { Book, BookStatus } from './book.entity';

/** Token de inyección del repo (interfaces no existen en runtime). */
export const BOOK_REPOSITORY = 'BOOK_REPOSITORY';

export interface BookFilter {
  status?: BookStatus;
  categoryId?: number;
}

export interface CreateBookInput {
  title: string;
  author: string;
  status?: BookStatus;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  rating?: number | null;
  categoryId?: number | null;
}

export interface UpdateBookInput {
  title?: string;
  author?: string;
  status?: BookStatus;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  rating?: number | null;
  categoryId?: number | null;
}

/**
 * Contrato de acceso a persistencia de libros.
 *
 * Todos los métodos asumen "solo datos de `ownerUserId`": un libro es
 * SIEMPRE privado de su propietario (a diferencia de categorías, no hay
 * vista de solo-lectura hijo→padre).
 */
export interface BookRepository {
  findById(id: number, ownerUserId: number): Promise<Book | null>;
  /** Sin acotar por owner: usado por otros dominios (p. ej. Rewards) que necesitan
   *  el libro para luego resolver ellos mismos si su propietario es "su hijo". */
  findByIdAny(id: number): Promise<Book | null>;
  listByOwner(ownerUserId: number, filter?: BookFilter): Promise<Book[]>;
  create(input: CreateBookInput, ownerUserId: number): Promise<Book>;
  update(id: number, ownerUserId: number, patch: UpdateBookInput): Promise<Book>;
  delete(id: number, ownerUserId: number): Promise<void>;
  /** Usado para validar `categoryId` al crear/editar: la categoría debe ser del mismo owner. */
  categoryBelongsToOwner(categoryId: number, ownerUserId: number): Promise<boolean>;
}

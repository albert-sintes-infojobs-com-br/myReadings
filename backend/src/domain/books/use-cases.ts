import type { Book, BookStatus } from './book.entity';
import type {
  BookFilter,
  BookRepository,
  CreateBookInput,
  UpdateBookInput,
} from './book.repository';
import {
  DomainNotFound,
  DomainValidation,
  OwnershipError,
} from '../shared/domain-errors';
import type { ActorView } from '../shared/actor';
import { assertOwnsChild } from '../goals/use-cases';
import type { UserRepository } from '../users/user.repository';

/**
 * Use cases de Libros (Fase 5).
 *
 * Reglas de negocio:
 *  - `rating`: entero 0-5 (nullable).
 *  - `startDate`/`endDate`: formato `YYYY-MM-DD`; si ambas existen,
 *    `endDate >= startDate`.
 *  - Transiciones de estado válidas (no se puede "retroceder" ni salir de
 *    `FINISHED`):
 *      NOT_STARTED → NOT_STARTED | READING | FINISHED
 *      READING     → READING | FINISHED
 *      FINISHED    → FINISHED (terminal)
 *  - `categoryId` (si se indica) debe pertenecer al mismo propietario.
 *  - Propiedad: cada actor gestiona SOLO sus propios libros (sin vista
 *    compartida hijo↔padre, a diferencia de categorías).
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const ALLOWED_TRANSITIONS: Record<BookStatus, BookStatus[]> = {
  NOT_STARTED: ['NOT_STARTED', 'READING', 'FINISHED'],
  READING: ['READING', 'FINISHED'],
  FINISHED: ['FINISHED'],
};

function assertValidDate(value: string, field: string): void {
  if (!DATE_RE.test(value) || Number.isNaN(new Date(value).getTime())) {
    throw new DomainValidation(`${field} debe tener formato YYYY-MM-DD`);
  }
}

function assertValidCommonFields(input: {
  title?: string;
  author?: string;
  rating?: number | null;
  startDate?: string | null;
  endDate?: string | null;
}): void {
  if (input.title !== undefined && input.title.trim().length === 0) {
    throw new DomainValidation('El título debe tener al menos 1 carácter');
  }
  if (input.author !== undefined && input.author.trim().length === 0) {
    throw new DomainValidation('El autor debe tener al menos 1 carácter');
  }
  if (
    input.rating !== undefined &&
    input.rating !== null &&
    (!Number.isInteger(input.rating) || input.rating < 0 || input.rating > 5)
  ) {
    throw new DomainValidation('rating debe ser un entero entre 0 y 5');
  }
  if (input.startDate) assertValidDate(input.startDate, 'startDate');
  if (input.endDate) assertValidDate(input.endDate, 'endDate');
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    throw new DomainValidation('endDate debe ser posterior o igual a startDate');
  }
}

function assertOwnership(book: Book, actor: ActorView): void {
  if (book.ownerUserId !== actor.id) {
    throw new OwnershipError('No puedes modificar un libro que no es tuyo');
  }
}

async function assertValidCategory(
  repo: BookRepository,
  categoryId: number | null | undefined,
  ownerUserId: number,
): Promise<void> {
  if (categoryId === undefined || categoryId === null) return;
  const belongs = await repo.categoryBelongsToOwner(categoryId, ownerUserId);
  if (!belongs) {
    throw new DomainValidation('categoryId no corresponde a una categoría propia');
  }
}

// ─────────────────────────── Create ───────────────────────────

export class CreateBookUseCase {
  constructor(private readonly repo: BookRepository) {}

  async execute(actor: ActorView, input: CreateBookInput): Promise<Book> {
    if (!input.title || !input.author) {
      throw new DomainValidation('title y author son obligatorios');
    }
    assertValidCommonFields(input);
    await assertValidCategory(this.repo, input.categoryId, actor.id);

    return this.repo.create(
      {
        title: input.title.trim(),
        author: input.author.trim(),
        status: input.status ?? 'NOT_STARTED',
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        notes: input.notes ?? null,
        rating: input.rating ?? null,
        categoryId: input.categoryId ?? null,
      },
      actor.id,
    );
  }
}

// ─────────────────────────── List ───────────────────────────

export class ListBooksUseCase {
  constructor(private readonly repo: BookRepository) {}

  async execute(actor: ActorView, filter?: BookFilter): Promise<Book[]> {
    return this.repo.listByOwner(actor.id, filter);
  }
}

// ─────────────────────────── List (hijo, solo lectura para el padre) ───────────────────────────

export class ListChildBooksUseCase {
  constructor(
    private readonly repo: BookRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(actor: ActorView, childId: number, filter?: BookFilter): Promise<Book[]> {
    await assertOwnsChild(this.users, actor, childId);
    return this.repo.listByOwner(childId, filter);
  }
}

// ─────────────────────────── Get ───────────────────────────

export class GetBookUseCase {
  constructor(private readonly repo: BookRepository) {}

  async execute(actor: ActorView, id: number): Promise<Book> {
    const book = await this.repo.findById(id, actor.id);
    if (!book) {
      throw new DomainNotFound('Libro no encontrado', 'book');
    }
    return book;
  }
}

// ─────────────────────────── Update ───────────────────────────

export class UpdateBookUseCase {
  constructor(private readonly repo: BookRepository) {}

  async execute(actor: ActorView, id: number, patch: UpdateBookInput): Promise<Book> {
    if (!patch || typeof patch !== 'object') {
      throw new DomainValidation('Debe indicar al menos un campo a actualizar');
    }
    const book = await this.repo.findById(id, actor.id);
    if (!book) {
      throw new DomainNotFound('Libro no encontrado', 'book');
    }
    assertOwnership(book, actor);

    // Fechas/rating se validan combinando lo existente + el patch, para
    // poder rechazar p. ej. un endDate anterior al startDate ya guardado.
    const mergedStart = patch.startDate !== undefined ? patch.startDate : book.startDate;
    const mergedEnd = patch.endDate !== undefined ? patch.endDate : book.endDate;
    assertValidCommonFields({
      title: patch.title,
      author: patch.author,
      rating: patch.rating,
      startDate: mergedStart,
      endDate: mergedEnd,
    });

    if (patch.status !== undefined && patch.status !== book.status) {
      const allowed = ALLOWED_TRANSITIONS[book.status];
      if (!allowed.includes(patch.status)) {
        throw new DomainValidation(
          `Transición de estado inválida: ${book.status} → ${patch.status}`,
        );
      }
    }

    await assertValidCategory(this.repo, patch.categoryId, actor.id);

    const clean: UpdateBookInput = {};
    if (patch.title !== undefined) clean.title = patch.title.trim();
    if (patch.author !== undefined) clean.author = patch.author.trim();
    if (patch.status !== undefined) clean.status = patch.status;
    if (patch.startDate !== undefined) clean.startDate = patch.startDate;
    if (patch.endDate !== undefined) clean.endDate = patch.endDate;
    if (patch.notes !== undefined) clean.notes = patch.notes;
    if (patch.rating !== undefined) clean.rating = patch.rating;
    if (patch.categoryId !== undefined) clean.categoryId = patch.categoryId;
    if (Object.keys(clean).length === 0) {
      throw new DomainValidation('Debe indicar al menos un campo a actualizar');
    }
    return this.repo.update(id, actor.id, clean);
  }
}

// ─────────────────────────── Delete ───────────────────────────

export class DeleteBookUseCase {
  constructor(private readonly repo: BookRepository) {}

  async execute(actor: ActorView, id: number): Promise<void> {
    const book = await this.repo.findById(id, actor.id);
    if (!book) {
      throw new DomainNotFound('Libro no encontrado', 'book');
    }
    assertOwnership(book, actor);
    await this.repo.delete(id, actor.id);
  }
}

import type { Category } from './category.entity';
import {
  type CategoryRepository,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from './category.repository';
import {
  ConflictError,
  DomainNotFound,
  DomainValidation,
  OwnershipError,
} from '../shared/domain-errors';
import type { ActorView } from '../shared/actor';

/**
 * Use cases de Categorías (Fase 4).
 *
 * Reglas de negocio comunes:
 *  - colorHex: `#RRGGBB` (6 dígitos hexadecimales, case-insensitive).
 *  - Propietariedad: cada actor gestiona SOLO las categorías cuyo
 *    `ownerUserId` es su propio id. (El hijo puede VER las del padre vía
 *    ListCategoriesUseCase, pero no editarlas ni borrarlas.)
 *  - Borrado: se niega (ConflictError) si la categoría aún tiene libros.
 *
 * El dominio no lanza errores HTTP: lanza errores de dominio tipados que
 * la capa de transporte traduce a status codes.
 */

const COLOR_HEX_RE = /^#[0-9a-fA-F]{6}$/;

function assertValidInput(input: {
  title?: string;
  colorHex?: string;
}): void {
  if (input.title !== undefined) {
    if (typeof input.title !== 'string' || input.title.trim().length === 0) {
      throw new DomainValidation('El título debe tener al menos 1 carácter');
    }
  }
  if (input.colorHex !== undefined && !COLOR_HEX_RE.test(input.colorHex)) {
    throw new DomainValidation(
      'El color debe ser un hex #RRGGBB (p. ej. #1E88E5)',
    );
  }
}

/** El actor es propietario de la categoría. */
function assertOwnership(category: Category, actor: ActorView): void {
  if (category.ownerUserId !== actor.id) {
    throw new OwnershipError('No puedes modificar una categoría que no es tuya');
  }
}

// ─────────────────────────── Create ───────────────────────────

export class CreateCategoryUseCase {
  constructor(private readonly repo: CategoryRepository) {}

  async execute(actor: ActorView, input: CreateCategoryInput): Promise<Category> {
    assertValidInput(input);
    return this.repo.create(
      {
        title: input.title.trim(),
        colorHex: input.colorHex,
        description: input.description ?? null,
      },
      actor.id,
    );
  }
}

// ─────────────────────────── List ───────────────────────────

export class ListCategoriesUseCase {
  constructor(private readonly repo: CategoryRepository) {}

  /** Cada actor ve SOLO sus propias categorías (padre e hijo, sin vista cruzada). */
  async execute(actor: ActorView): Promise<Category[]> {
    return this.repo.listByOwner(actor.id);
  }
}

// ─────────────────────────── Get ───────────────────────────

export class GetCategoryUseCase {
  constructor(private readonly repo: CategoryRepository) {}

  async execute(actor: ActorView, id: number): Promise<Category> {
    const category = await this.repo.findById(id, actor.id);
    if (!category) {
      throw new DomainNotFound('Categoría no encontrada', 'category');
    }
    return category;
  }
}

// ─────────────────────────── Update ───────────────────────────

export class UpdateCategoryUseCase {
  constructor(private readonly repo: CategoryRepository) {}

  async execute(
    actor: ActorView,
    id: number,
    patch: UpdateCategoryInput,
  ): Promise<Category> {
    if (!patch || typeof patch !== 'object') {
      throw new DomainValidation('Debe indicar al menos un campo a actualizar');
    }
    assertValidInput(patch);
    const category = await this.repo.findById(id, actor.id);
    if (!category) {
      throw new DomainNotFound('Categoría no encontrada', 'category');
    }
    assertOwnership(category, actor);

    const clean: UpdateCategoryInput = {};
    if (patch.title !== undefined) clean.title = patch.title.trim();
    if (patch.colorHex !== undefined) clean.colorHex = patch.colorHex;
    if (patch.description !== undefined) clean.description = patch.description;
    if (Object.keys(clean).length === 0) {
      throw new DomainValidation('Debe indicar al menos un campo a actualizar');
    }
    return this.repo.update(id, actor.id, clean);
  }
}

// ─────────────────────────── Delete ───────────────────────────

export class DeleteCategoryUseCase {
  constructor(private readonly repo: CategoryRepository) {}

  async execute(actor: ActorView, id: number): Promise<void> {
    const category = await this.repo.findById(id, actor.id);
    if (!category) {
      throw new DomainNotFound('Categoría no encontrada', 'category');
    }
    assertOwnership(category, actor);

    const books = await this.repo.bookCount(id, actor.id);
    if (books > 0) {
      throw new ConflictError(
        `No se puede eliminar: la categoría tiene ${books} libro(s). Reasígnalos primero.`,
      );
    }
    await this.repo.delete(id, actor.id);
  }
}

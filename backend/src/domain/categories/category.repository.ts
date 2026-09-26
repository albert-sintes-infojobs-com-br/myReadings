import type { Category } from './category.entity';

/** Token de inyección del repo (interfaces no existen en runtime: Nest
 *  no puede usarlas como token vía design:paramtypes). */
export const CATEGORY_REPOSITORY = 'CATEGORY_REPOSITORY';

/**
 * Contrato de acceso a persistencia de categorías.
 *
 * El dominio define el CÓMO NO se guarda (interface); la capa
 * `src/persistence/categories` lo implementa con Prisma.
 * Todos los métodos asumen "solo datos de `ownerUserId`" — el filtrado
 * por propietario ES la semántica del contrato, no un detalle de Prisma.
 *
 * Errores que puede lanzar cualquier implementación:
 *  - CategoryNotFoundError  (no existe / no es del owner)
 */
export interface CategoryRepository {
  findById(id: number, ownerUserId: number): Promise<Category | null>;
  /** Devuelve SOLO las categorías cuyo owner es `ownerUserId`. */
  listByOwner(ownerUserId: number): Promise<Category[]>;
  create(input: CreateCategoryInput, ownerUserId: number): Promise<Category>;
  /** Devuelve el estado tras actualizar. */
  update(id: number, ownerUserId: number, patch: UpdateCategoryInput): Promise<Category>;
  /** `bookCount` se usa en la regla de borrado (409 si >0). */
  bookCount(categoryId: number, ownerUserId: number): Promise<number>;
  delete(id: number, ownerUserId: number): Promise<void>;
}

export interface CreateCategoryInput {
  title: string;
  colorHex: string;
  description?: string | null;
}

export interface UpdateCategoryInput {
  title?: string;
  colorHex?: string;
  description?: string | null;
}

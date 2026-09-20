import type { Goal, GoalStatus } from './goal.entity';

/** Token de inyección del repo (interfaces no existen en runtime). */
export const GOAL_REPOSITORY = 'GOAL_REPOSITORY';

export interface CreateGoalInput {
  name: string;
  description?: string | null;
  targetPoints: number;
}

export interface UpdateGoalInput {
  name?: string;
  description?: string | null;
  targetPoints?: number;
}

/**
 * Contrato de acceso a persistencia de metas.
 *
 * A diferencia de categorías/libros, una meta no tiene `ownerUserId`
 * directo: pertenece a un `childId`. La comprobación "¿es mi hijo?" la
 * hace el use case (vía `UserRepository`, del dominio `users`), no este
 * repositorio — por eso `findById`/`update`/`delete` no reciben owner.
 */
export interface GoalRepository {
  findById(id: number): Promise<Goal | null>;
  listByChild(childId: number): Promise<Goal[]>;
  create(input: CreateGoalInput, childId: number, createdByParentId: number): Promise<Goal>;
  update(id: number, patch: UpdateGoalInput): Promise<Goal>;
  delete(id: number): Promise<void>;
  /** Transición de estado gestionada por el sistema (ACHIEVED/REDEEMED), no por el padre. */
  setStatus(id: number, status: GoalStatus): Promise<Goal>;
}

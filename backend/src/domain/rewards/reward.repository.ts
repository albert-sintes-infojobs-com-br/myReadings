import type { Reward, RewardStatus, RewardType } from './reward.entity';

/** Token de inyección del repo (interfaces no existen en runtime). */
export const REWARD_REPOSITORY = 'REWARD_REPOSITORY';

export interface CreateRewardInput {
  type: RewardType;
  value: number;
  deadline: string;
  penaltyValue?: number | null;
  goalId?: number | null;
}

export interface UpdateRewardInput {
  type?: RewardType;
  value?: number;
  deadline?: string;
  penaltyValue?: number | null;
  goalId?: number | null;
}

/**
 * Contrato de acceso a persistencia de recompensas.
 *
 * Sin `ownerUserId` propio (pertenece a un `bookId`): la comprobación
 * "¿el libro es de un hijo mío?" la hace el use case (vía `BookRepository`
 * + `UserRepository`), no este repositorio.
 */
export interface RewardRepository {
  findById(id: number): Promise<Reward | null>;
  /** Recompensas de libros propios (vista del hijo). */
  listByBookOwner(ownerUserId: number): Promise<Reward[]>;
  /** Recompensas de libros de CUALQUIER hijo de este padre (vista del padre). */
  listByParent(parentId: number): Promise<Reward[]>;
  /** PENDING de un libro concreto — usado por el motor de resolución al terminar un libro. */
  listPendingByBook(bookId: number): Promise<Reward[]>;
  /** TODAS las PENDING del sistema — usado por la tarea programada diaria. */
  listAllPending(): Promise<Reward[]>;
  create(input: CreateRewardInput, bookId: number, createdByParentId: number): Promise<Reward>;
  update(id: number, patch: UpdateRewardInput): Promise<Reward>;
  delete(id: number): Promise<void>;
  /** Transición de estado gestionada por el motor de resolución (Fase 8), no por el padre. */
  resolve(id: number, status: Extract<RewardStatus, 'FULFILLED' | 'PENALIZED'>, resolvedAt: Date): Promise<Reward>;
}

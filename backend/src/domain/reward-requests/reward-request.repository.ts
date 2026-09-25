import type { RewardRequest, RewardRequestStatus } from './reward-request.entity';

/** Token de inyección del repo (interfaces no existen en runtime). */
export const REWARD_REQUEST_REPOSITORY = 'REWARD_REQUEST_REPOSITORY';

/**
 * Contrato de acceso a persistencia de solicitudes de recompensa.
 * Sin `ownerUserId`: la propiedad se resuelve en el dominio (childId → su padre).
 */
export interface RewardRequestRepository {
  findById(id: number): Promise<RewardRequest | null>;
  /** Solo `PENDING`, de libros de CUALQUIERA de los hijos de este padre. */
  listPendingByParent(parentId: number): Promise<RewardRequest[]>;
  /** TODAS (cualquier status) las solicitudes de un hijo concreto. */
  listByChild(childId: number): Promise<RewardRequest[]>;
  create(bookId: number, childId: number): Promise<RewardRequest>;
  resolve(
    id: number,
    status: Extract<RewardRequestStatus, 'RESOLVED' | 'DISMISSED'>,
    resolvedAt: Date,
  ): Promise<RewardRequest>;
}

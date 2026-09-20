import type { RewardRequest } from './reward-request.entity';
import type { RewardRequestRepository } from './reward-request.repository';
import type { BookRepository } from '../books/book.repository';
import type { NotificationRepository } from '../notifications/notification.repository';
import type { UserRepository } from '../users/user.repository';
import { assertOwnsChild } from '../goals/use-cases';
import { ConflictError, DomainNotFound, DomainValidation } from '../shared/domain-errors';
import type { ActorView } from '../shared/actor';

/**
 * Use cases de Solicitudes de recompensa (Fase 9).
 *
 * Flujo (ver docs/03-reglas-de-negocio.md §3):
 *  1. El hijo solicita recompensa sobre un libro PROPIO en `NOT_STARTED`.
 *  2. Se crea la `RewardRequest` (`PENDING`) + una `Notification`
 *     `REWARD_REQUEST` al padre (`actor.parentId`, ya resuelto en el JWT).
 *  3. El padre la resuelve: `RESOLVED` (creó la Reward) o `DISMISSED`.
 */

const REQUEST_MESSAGE = 'recompensa pendiente de activar';

export class CreateRewardRequestUseCase {
  constructor(
    private readonly requests: RewardRequestRepository,
    private readonly books: BookRepository,
    private readonly notifications: NotificationRepository,
  ) {}

  async execute(actor: ActorView, bookId: number): Promise<RewardRequest> {
    const book = await this.books.findById(bookId, actor.id);
    if (!book) {
      throw new DomainNotFound('Libro no encontrado', 'book');
    }
    if (book.status !== 'NOT_STARTED') {
      throw new ConflictError('El libro debe estar en NOT_STARTED para solicitar una recompensa');
    }
    const request = await this.requests.create(bookId, actor.id);
    if (actor.parentId) {
      await this.notifications.create({
        recipientUserId: actor.parentId,
        type: 'REWARD_REQUEST',
        refBookId: bookId,
        message: REQUEST_MESSAGE,
      });
    }
    return request;
  }
}

export class ListPendingRewardRequestsUseCase {
  constructor(private readonly requests: RewardRequestRepository) {}

  async execute(actor: ActorView): Promise<RewardRequest[]> {
    return this.requests.listPendingByParent(actor.id);
  }
}

export class ResolveRewardRequestUseCase {
  constructor(
    private readonly requests: RewardRequestRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(
    actor: ActorView,
    id: number,
    status: 'RESOLVED' | 'DISMISSED',
  ): Promise<RewardRequest> {
    if (status !== 'RESOLVED' && status !== 'DISMISSED') {
      throw new DomainValidation('status debe ser RESOLVED o DISMISSED');
    }
    const request = await this.requests.findById(id);
    if (!request) {
      throw new DomainNotFound('Solicitud no encontrada', 'reward-request');
    }
    await assertOwnsChild(this.users, actor, request.childId);
    if (request.status !== 'PENDING') {
      throw new ConflictError('La solicitud ya fue resuelta');
    }
    return this.requests.resolve(id, status, new Date());
  }
}

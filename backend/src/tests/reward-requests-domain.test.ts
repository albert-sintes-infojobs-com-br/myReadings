import { describe, expect, it, vi } from 'vitest';
import {
  CreateRewardRequestUseCase,
  ListPendingRewardRequestsUseCase,
  ResolveRewardRequestUseCase,
} from '../domain/reward-requests/use-cases';
import { ConflictError, DomainNotFound, DomainValidation, OwnershipError } from '../domain/shared/domain-errors';
import type { RewardRequestRepository } from '../domain/reward-requests/reward-request.repository';
import type { BookRepository } from '../domain/books/book.repository';
import type { NotificationRepository } from '../domain/notifications/notification.repository';
import type { UserRepository } from '../domain/users/user.repository';
import type { RewardRequest } from '../domain/reward-requests/reward-request.entity';
import type { Book } from '../domain/books/book.entity';
import type { SafeUser } from '../domain/users/user.entity';
import type { ActorView } from '../domain/shared/actor';

/**
 * Tests de dominio de Solicitudes de recompensa (Fase 9). TDD: sin
 * NestJS ni Prisma.
 */

const CHILD: ActorView = { id: 9, role: 'CHILD', parentId: 5 };
const PARENT: ActorView = { id: 5, role: 'PARENT', parentId: null };
const OTHER_PARENT: ActorView = { id: 77, role: 'PARENT', parentId: null };
const MY_CHILD: SafeUser = { id: 9, name: 'Lucas', email: 'lucas@test.com', role: 'CHILD', parentId: 5 };

function makeBook(over: Partial<Book> = {}): Book {
  return {
    id: 10, ownerUserId: 9, title: 'Dune', author: 'Frank Herbert', status: 'NOT_STARTED',
    startDate: null, endDate: null, notes: null, rating: null, categoryId: null,
    createdAt: new Date('2026-09-01T10:00:00Z'), updatedAt: new Date('2026-09-01T10:00:00Z'),
    ...over,
  };
}

function makeRequest(over: Partial<RewardRequest> = {}): RewardRequest {
  return {
    id: 4, bookId: 10, childId: 9, status: 'PENDING',
    createdAt: new Date('2026-09-01T10:00:00Z'), resolvedAt: null,
    ...over,
  };
}

function requestsMock() {
  return { findById: vi.fn(), listPendingByParent: vi.fn(), create: vi.fn(), resolve: vi.fn() };
}
function booksMock() {
  return {
    findById: vi.fn(), findByIdAny: vi.fn(), listByOwner: vi.fn(), create: vi.fn(), update: vi.fn(),
    delete: vi.fn(), categoryBelongsToOwner: vi.fn(),
  };
}
function notificationsMock() {
  return { create: vi.fn(), findById: vi.fn(), listByRecipient: vi.fn(), countUnread: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() };
}
function usersMock() {
  return { findByEmail: vi.fn(), findById: vi.fn(), listChildren: vi.fn(), createParent: vi.fn(), createChild: vi.fn() };
}

describe('CreateRewardRequestUseCase', () => {
  function build() {
    const requests = requestsMock();
    const books = booksMock();
    const notifications = notificationsMock();
    const uc = new CreateRewardRequestUseCase(
      requests as unknown as RewardRequestRepository,
      books as unknown as BookRepository,
      notifications as unknown as NotificationRepository,
    );
    return { uc, requests, books, notifications };
  }

  it('crea la solicitud y notifica al padre (actor.parentId)', async () => {
    const { uc, requests, books, notifications } = build();
    books.findById.mockResolvedValue(makeBook());
    requests.create.mockResolvedValue(makeRequest());

    const req = await uc.execute(CHILD, 10);

    expect(requests.create).toHaveBeenCalledWith(10, 9);
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: 5, type: 'REWARD_REQUEST', refBookId: 10 }),
    );
    expect(req.status).toBe('PENDING');
  });

  it('rechaza libro ajeno o inexistente (DomainNotFound)', async () => {
    const { uc, books, requests } = build();
    books.findById.mockResolvedValue(null);
    await expect(uc.execute(CHILD, 999)).rejects.toThrow(DomainNotFound);
    expect(requests.create).not.toHaveBeenCalled();
  });

  it('rechaza libro que no está NOT_STARTED (ConflictError)', async () => {
    const { uc, books, requests } = build();
    books.findById.mockResolvedValue(makeBook({ status: 'READING' }));
    await expect(uc.execute(CHILD, 10)).rejects.toThrow(ConflictError);
    expect(requests.create).not.toHaveBeenCalled();
  });
});

describe('ListPendingRewardRequestsUseCase', () => {
  it('delega en el repo con el parentId del actor', async () => {
    const requests = requestsMock();
    requests.listPendingByParent.mockResolvedValue([makeRequest()]);
    const uc = new ListPendingRewardRequestsUseCase(requests as unknown as RewardRequestRepository);
    const list = await uc.execute(PARENT);
    expect(requests.listPendingByParent).toHaveBeenCalledWith(5);
    expect(list).toHaveLength(1);
  });
});

describe('ResolveRewardRequestUseCase', () => {
  function build() {
    const requests = requestsMock();
    const users = usersMock();
    const uc = new ResolveRewardRequestUseCase(
      requests as unknown as RewardRequestRepository,
      users as unknown as UserRepository,
    );
    return { uc, requests, users };
  }

  it('resuelve (RESOLVED) una solicitud de un hijo propio', async () => {
    const { uc, requests, users } = build();
    requests.findById.mockResolvedValue(makeRequest());
    users.findById.mockResolvedValue(MY_CHILD);
    requests.resolve.mockResolvedValue(makeRequest({ status: 'RESOLVED' }));

    const result = await uc.execute(PARENT, 4, 'RESOLVED');
    expect(requests.resolve).toHaveBeenCalledWith(4, 'RESOLVED', expect.any(Date));
    expect(result.status).toBe('RESOLVED');
  });

  it('descarta (DISMISSED) una solicitud', async () => {
    const { uc, requests, users } = build();
    requests.findById.mockResolvedValue(makeRequest());
    users.findById.mockResolvedValue(MY_CHILD);
    requests.resolve.mockResolvedValue(makeRequest({ status: 'DISMISSED' }));
    await uc.execute(PARENT, 4, 'DISMISSED');
    expect(requests.resolve).toHaveBeenCalledWith(4, 'DISMISSED', expect.any(Date));
  });

  it('rechaza status inválido (DomainValidation)', async () => {
    const { uc, requests } = build();
    await expect(uc.execute(PARENT, 4, 'BOGUS' as never)).rejects.toThrow(DomainValidation);
    expect(requests.findById).not.toHaveBeenCalled();
  });

  it('solicitud inexistente → DomainNotFound', async () => {
    const { uc, requests } = build();
    requests.findById.mockResolvedValue(null);
    await expect(uc.execute(PARENT, 999, 'RESOLVED')).rejects.toThrow(DomainNotFound);
  });

  it('rechaza solicitud de un hijo ajeno (OwnershipError)', async () => {
    const { uc, requests, users } = build();
    requests.findById.mockResolvedValue(makeRequest());
    users.findById.mockResolvedValue(MY_CHILD); // parentId=5, actor=77
    await expect(uc.execute(OTHER_PARENT, 4, 'RESOLVED')).rejects.toThrow(OwnershipError);
  });

  it('rechaza resolver una solicitud ya resuelta (ConflictError)', async () => {
    const { uc, requests, users } = build();
    requests.findById.mockResolvedValue(makeRequest({ status: 'RESOLVED' }));
    users.findById.mockResolvedValue(MY_CHILD);
    await expect(uc.execute(PARENT, 4, 'DISMISSED')).rejects.toThrow(ConflictError);
    expect(requests.resolve).not.toHaveBeenCalled();
  });
});

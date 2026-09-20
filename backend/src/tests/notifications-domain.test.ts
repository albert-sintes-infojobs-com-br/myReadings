import { describe, expect, it, vi } from 'vitest';
import {
  CountUnreadNotificationsUseCase,
  ListMyNotificationsUseCase,
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
} from '../domain/notifications/use-cases';
import { DomainNotFound } from '../domain/shared/domain-errors';
import type { NotificationRepository } from '../domain/notifications/notification.repository';
import type { Notification } from '../domain/notifications/notification.entity';
import type { ActorView } from '../domain/shared/actor';

/**
 * Tests de dominio de Notificaciones (Fase 9). TDD: sin NestJS ni Prisma.
 */

const CHILD: ActorView = { id: 9, role: 'CHILD', parentId: 5 };
const OTHER_CHILD: ActorView = { id: 10, role: 'CHILD', parentId: 5 };

function makeNotification(over: Partial<Notification> = {}): Notification {
  return {
    id: 1, recipientUserId: 9, type: 'REWARD_FULFILLED', refBookId: 10, refRewardId: 7,
    message: 'Tu recompensa se ha cumplido', read: false, createdAt: new Date('2026-09-01T10:00:00Z'),
    ...over,
  };
}

function repoMock() {
  return { create: vi.fn(), findById: vi.fn(), listByRecipient: vi.fn(), countUnread: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() };
}

describe('ListMyNotificationsUseCase', () => {
  it('delega en el repo con el actor.id y el filtro onlyUnread', async () => {
    const repo = repoMock();
    repo.listByRecipient.mockResolvedValue([makeNotification()]);
    const uc = new ListMyNotificationsUseCase(repo as unknown as NotificationRepository);

    const list = await uc.execute(CHILD, true);
    expect(repo.listByRecipient).toHaveBeenCalledWith(9, true);
    expect(list).toHaveLength(1);
  });
});

describe('CountUnreadNotificationsUseCase', () => {
  it('devuelve el conteo de no leídas del actor', async () => {
    const repo = repoMock();
    repo.countUnread.mockResolvedValue(3);
    const uc = new CountUnreadNotificationsUseCase(repo as unknown as NotificationRepository);
    expect(await uc.execute(CHILD)).toBe(3);
    expect(repo.countUnread).toHaveBeenCalledWith(9);
  });
});

describe('MarkNotificationReadUseCase', () => {
  it('marca como leída una notificación propia', async () => {
    const repo = repoMock();
    repo.findById.mockResolvedValue(makeNotification());
    repo.markRead.mockResolvedValue(makeNotification({ read: true }));
    const uc = new MarkNotificationReadUseCase(repo as unknown as NotificationRepository);

    const n = await uc.execute(CHILD, 1);
    expect(repo.markRead).toHaveBeenCalledWith(1);
    expect(n.read).toBe(true);
  });

  it('rechaza marcar una notificación de otro usuario (404, privacidad)', async () => {
    const repo = repoMock();
    repo.findById.mockResolvedValue(makeNotification({ recipientUserId: 9 }));
    const uc = new MarkNotificationReadUseCase(repo as unknown as NotificationRepository);
    await expect(uc.execute(OTHER_CHILD, 1)).rejects.toThrow(DomainNotFound);
    expect(repo.markRead).not.toHaveBeenCalled();
  });

  it('notificación inexistente → DomainNotFound', async () => {
    const repo = repoMock();
    repo.findById.mockResolvedValue(null);
    const uc = new MarkNotificationReadUseCase(repo as unknown as NotificationRepository);
    await expect(uc.execute(CHILD, 999)).rejects.toThrow(DomainNotFound);
  });
});

describe('MarkAllNotificationsReadUseCase', () => {
  it('marca todas las propias como leídas y devuelve el conteo', async () => {
    const repo = repoMock();
    repo.markAllRead.mockResolvedValue(5);
    const uc = new MarkAllNotificationsReadUseCase(repo as unknown as NotificationRepository);
    expect(await uc.execute(CHILD)).toBe(5);
    expect(repo.markAllRead).toHaveBeenCalledWith(9);
  });
});

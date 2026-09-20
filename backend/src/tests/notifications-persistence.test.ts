import { describe, expect, it, vi } from 'vitest';
import { PrismaNotificationRepository } from '../persistence/notifications/prisma-notification.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('PrismaNotificationRepository', () => {
  const baseRow = {
    id: 1, recipientUserId: 5, type: 'REWARD_REQUEST', refBookId: 10, refRewardId: null,
    message: 'recompensa pendiente de activar', read: false, createdAt: new Date('2026-09-01T10:00:00Z'),
  };

  function prismaMock() {
    return {
      notification: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    };
  }

  let prisma: ReturnType<typeof prismaMock>;
  let repo: PrismaNotificationRepository;

  function setup() {
    prisma = prismaMock();
    repo = new PrismaNotificationRepository(prisma as unknown as PrismaService);
  }

  it('create persiste con los campos dados', async () => {
    setup();
    prisma.notification.create.mockResolvedValue(baseRow);
    await repo.create({ recipientUserId: 5, type: 'REWARD_REQUEST', refBookId: 10, message: 'recompensa pendiente de activar' });
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ recipientUserId: 5, type: 'REWARD_REQUEST' }) }),
    );
  });

  it('listByRecipient con onlyUnread filtra read:false', async () => {
    setup();
    prisma.notification.findMany.mockResolvedValue([baseRow]);
    await repo.listByRecipient(5, true);
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { recipientUserId: 5, read: false } }),
    );
  });

  it('listByRecipient sin onlyUnread no filtra por read', async () => {
    setup();
    prisma.notification.findMany.mockResolvedValue([baseRow]);
    await repo.listByRecipient(5);
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { recipientUserId: 5 } }),
    );
  });

  it('countUnread cuenta read:false del destinatario', async () => {
    setup();
    prisma.notification.count.mockResolvedValue(3);
    const n = await repo.countUnread(5);
    expect(n).toBe(3);
    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { recipientUserId: 5, read: false } });
  });

  it('markRead marca una notificación como leída', async () => {
    setup();
    prisma.notification.update.mockResolvedValue({ ...baseRow, read: true });
    const n = await repo.markRead(1);
    expect(n.read).toBe(true);
    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { read: true } }),
    );
  });

  it('markAllRead marca todas las no leídas del destinatario y devuelve el conteo', async () => {
    setup();
    prisma.notification.updateMany.mockResolvedValue({ count: 4 });
    const n = await repo.markAllRead(5);
    expect(n).toBe(4);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { recipientUserId: 5, read: false } }),
    );
  });
});

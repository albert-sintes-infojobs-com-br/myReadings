import { describe, expect, it, vi } from 'vitest';
import { PrismaRewardRepository } from '../persistence/rewards/prisma-reward.repository';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Tests de persistencia (Prisma) de Recompensas (Fase 7). Prisma se
 * mockea a mano; la clave es la conversión Decimal→number y Date→YYYY-MM-DD,
 * y las queries por relación (book.ownerUserId / book.owner.parentId).
 */

describe('PrismaRewardRepository', () => {
  const baseRow = {
    id: 7,
    bookId: 10,
    createdByParentId: 5,
    type: 'POINTS',
    value: 200,
    deadline: new Date('2026-12-01T00:00:00.000Z'),
    penaltyValue: 50,
    goalId: 3,
    status: 'PENDING',
    resolvedAt: null,
    createdAt: new Date('2026-09-01T10:00:00Z'),
    updatedAt: new Date('2026-09-01T10:00:00Z'),
  };

  function prismaMock() {
    return {
      reward: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
  }

  let prisma: ReturnType<typeof prismaMock>;
  let repo: PrismaRewardRepository;

  function setup() {
    prisma = prismaMock();
    repo = new PrismaRewardRepository(prisma as unknown as PrismaService);
  }

  it('findById convierte value/penaltyValue a number y deadline a YYYY-MM-DD', async () => {
    setup();
    prisma.reward.findUnique.mockResolvedValue(baseRow);
    const reward = await repo.findById(7);
    expect(reward?.value).toBe(200);
    expect(reward?.penaltyValue).toBe(50);
    expect(reward?.deadline).toBe('2026-12-01');
  });

  it('listByBookOwner filtra por book.ownerUserId', async () => {
    setup();
    prisma.reward.findMany.mockResolvedValue([baseRow]);
    await repo.listByBookOwner(9);
    expect(prisma.reward.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { book: { ownerUserId: 9 } } }),
    );
  });

  it('listByParent filtra por book.owner.parentId', async () => {
    setup();
    prisma.reward.findMany.mockResolvedValue([baseRow]);
    await repo.listByParent(5);
    expect(prisma.reward.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { book: { owner: { parentId: 5 } } } }),
    );
  });

  it('create persiste con bookId/createdByParentId y deadline como Date', async () => {
    setup();
    prisma.reward.create.mockResolvedValue(baseRow);
    await repo.create({ type: 'POINTS', value: 200, deadline: '2026-12-01', goalId: 3 }, 10, 5);
    const data = prisma.reward.create.mock.calls[0][0].data;
    expect(data.bookId).toBe(10);
    expect(data.createdByParentId).toBe(5);
    expect(data.deadline).toBeInstanceOf(Date);
  });

  it('update solo envía los campos indicados', async () => {
    setup();
    prisma.reward.update.mockResolvedValue({ ...baseRow, value: 300 });
    await repo.update(7, { value: 300 });
    expect(prisma.reward.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 7 }, data: { value: 300 } }),
    );
  });

  it('delete elimina por id', async () => {
    setup();
    prisma.reward.delete.mockResolvedValue(baseRow);
    await repo.delete(7);
    expect(prisma.reward.delete).toHaveBeenCalledWith({ where: { id: 7 } });
  });
});

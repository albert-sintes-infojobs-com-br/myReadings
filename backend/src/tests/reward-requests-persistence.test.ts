import { describe, expect, it, vi } from 'vitest';
import { PrismaRewardRequestRepository } from '../persistence/reward-requests/prisma-reward-request.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('PrismaRewardRequestRepository', () => {
  const baseRow = {
    id: 4, bookId: 10, childId: 9, status: 'PENDING',
    createdAt: new Date('2026-09-01T10:00:00Z'), resolvedAt: null,
  };

  function prismaMock() {
    return {
      rewardRequest: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    };
  }

  let prisma: ReturnType<typeof prismaMock>;
  let repo: PrismaRewardRequestRepository;

  function setup() {
    prisma = prismaMock();
    repo = new PrismaRewardRequestRepository(prisma as unknown as PrismaService);
  }

  it('findById consulta por id', async () => {
    setup();
    prisma.rewardRequest.findUnique.mockResolvedValue(baseRow);
    const req = await repo.findById(4);
    expect(req?.status).toBe('PENDING');
  });

  it('listPendingByParent filtra PENDING + child.parentId', async () => {
    setup();
    prisma.rewardRequest.findMany.mockResolvedValue([baseRow]);
    await repo.listPendingByParent(5);
    expect(prisma.rewardRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PENDING', child: { parentId: 5 } } }),
    );
  });

  it('create persiste con status PENDING', async () => {
    setup();
    prisma.rewardRequest.create.mockResolvedValue(baseRow);
    await repo.create(10, 9);
    expect(prisma.rewardRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { bookId: 10, childId: 9, status: 'PENDING' } }),
    );
  });

  it('resolve actualiza status y resolvedAt', async () => {
    setup();
    prisma.rewardRequest.update.mockResolvedValue({ ...baseRow, status: 'RESOLVED' });
    const req = await repo.resolve(4, 'RESOLVED', new Date());
    expect(req.status).toBe('RESOLVED');
    expect(prisma.rewardRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 4 }, data: expect.objectContaining({ status: 'RESOLVED' }) }),
    );
  });
});

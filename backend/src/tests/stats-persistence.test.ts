import { describe, expect, it, vi } from 'vitest';
import { PrismaStatsRepository } from '../persistence/stats/prisma-stats.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('PrismaStatsRepository', () => {
  function prismaMock() {
    return {
      book: { groupBy: vi.fn(), findMany: vi.fn() },
      reward: { groupBy: vi.fn() },
    };
  }

  let prisma: ReturnType<typeof prismaMock>;
  let repo: PrismaStatsRepository;

  function setup() {
    prisma = prismaMock();
    repo = new PrismaStatsRepository(prisma as unknown as PrismaService);
  }

  it('booksByStatus usa groupBy y rellena los estados sin libros a 0', async () => {
    setup();
    prisma.book.groupBy.mockResolvedValue([
      { status: 'FINISHED', _count: { _all: 3 } },
      { status: 'NOT_STARTED', _count: { _all: 1 } },
    ]);
    const result = await repo.booksByStatus(9);
    expect(result).toEqual({ NOT_STARTED: 1, READING: 0, FINISHED: 3 });
    expect(prisma.book.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ['status'], where: { ownerUserId: 9 } }),
    );
  });

  it('finishedBooksByPeriod agrupa por año/mes de endDate', async () => {
    setup();
    prisma.book.findMany.mockResolvedValue([
      { endDate: new Date('2026-09-05T00:00:00Z') },
      { endDate: new Date('2026-09-20T00:00:00Z') },
      { endDate: new Date('2026-10-01T00:00:00Z') },
    ]);
    const result = await repo.finishedBooksByPeriod(9);
    expect(result).toEqual([
      { year: 2026, month: 9, count: 2 },
      { year: 2026, month: 10, count: 1 },
    ]);
    expect(prisma.book.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerUserId: 9, status: 'FINISHED', endDate: { not: null } } }),
    );
  });

  it('rewardsByStatus usa groupBy vía book.ownerUserId', async () => {
    setup();
    prisma.reward.groupBy.mockResolvedValue([{ status: 'FULFILLED', _count: { _all: 2 } }]);
    const result = await repo.rewardsByStatus(9);
    expect(result).toEqual({ PENDING: 0, FULFILLED: 2, PENALIZED: 0 });
    expect(prisma.reward.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ['status'], where: { book: { ownerUserId: 9 } } }),
    );
  });

  it('avgReadingDays calcula la media de días entre startDate y endDate', async () => {
    setup();
    prisma.book.findMany.mockResolvedValue([
      { startDate: new Date('2026-01-01T00:00:00Z'), endDate: new Date('2026-01-11T00:00:00Z') }, // 10 días
      { startDate: new Date('2026-02-01T00:00:00Z'), endDate: new Date('2026-02-06T00:00:00Z') }, // 5 días
    ]);
    const avg = await repo.avgReadingDays(9);
    expect(avg).toBe(7.5);
  });

  it('avgReadingDays devuelve null si no hay libros FINISHED con ambas fechas', async () => {
    setup();
    prisma.book.findMany.mockResolvedValue([]);
    const avg = await repo.avgReadingDays(9);
    expect(avg).toBeNull();
  });
});

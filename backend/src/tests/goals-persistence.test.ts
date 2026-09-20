import { describe, expect, it, vi } from 'vitest';
import { PrismaGoalRepository } from '../persistence/goals/prisma-goal.repository';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Tests de persistencia (Prisma) de Metas (Fase 6). Prisma se mockea a
 * mano; no hay acotamiento por owner aquí (lo hace el use case).
 */

describe('PrismaGoalRepository', () => {
  const baseRow = {
    id: 3,
    childId: 9,
    createdByParentId: 5,
    name: 'Videoconsola',
    description: null,
    targetPoints: 1000,
    status: 'ACTIVE',
    createdAt: new Date('2026-09-01T10:00:00Z'),
    updatedAt: new Date('2026-09-01T10:00:00Z'),
  };

  function prismaMock() {
    return {
      goal: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
  }

  let prisma: ReturnType<typeof prismaMock>;
  let repo: PrismaGoalRepository;

  function setup() {
    prisma = prismaMock();
    repo = new PrismaGoalRepository(prisma as unknown as PrismaService);
  }

  it('findById consulta por id', async () => {
    setup();
    prisma.goal.findUnique.mockResolvedValue(baseRow);
    const goal = await repo.findById(3);
    expect(prisma.goal.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 3 } }),
    );
    expect(goal?.name).toBe('Videoconsola');
  });

  it('listByChild filtra por childId', async () => {
    setup();
    prisma.goal.findMany.mockResolvedValue([baseRow]);
    await repo.listByChild(9);
    expect(prisma.goal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { childId: 9 } }),
    );
  });

  it('create persiste con childId, createdByParentId y status ACTIVE', async () => {
    setup();
    prisma.goal.create.mockResolvedValue(baseRow);
    await repo.create({ name: 'Videoconsola', targetPoints: 1000 }, 9, 5);
    expect(prisma.goal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ childId: 9, createdByParentId: 5, status: 'ACTIVE' }),
      }),
    );
  });

  it('update solo envía los campos indicados', async () => {
    setup();
    prisma.goal.update.mockResolvedValue({ ...baseRow, targetPoints: 1500 });
    await repo.update(3, { targetPoints: 1500 });
    expect(prisma.goal.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 3 }, data: { targetPoints: 1500 } }),
    );
  });

  it('delete elimina por id', async () => {
    setup();
    prisma.goal.delete.mockResolvedValue(baseRow);
    await repo.delete(3);
    expect(prisma.goal.delete).toHaveBeenCalledWith({ where: { id: 3 } });
  });
});

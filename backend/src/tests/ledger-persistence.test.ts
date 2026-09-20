import { describe, expect, it, vi } from 'vitest';
import { PrismaLedgerRepository } from '../persistence/ledger/prisma-ledger.repository';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Tests de persistencia (Prisma) del Ledger (Fase 8). Prisma se mockea a
 * mano; la clave es la conversión Decimal→number (incl. `_sum.amount`
 * null cuando no hay movimientos → 0).
 */

describe('PrismaLedgerRepository', () => {
  const baseRow = {
    id: 20, childId: 9, rewardId: 7, kind: 'POINTS', amount: 200, goalId: 3,
    reason: 'FULFILLED', createdAt: new Date('2026-09-01T10:00:00Z'),
  };

  function prismaMock() {
    return {
      ledgerEntry: { create: vi.fn(), aggregate: vi.fn(), findMany: vi.fn() },
    };
  }

  let prisma: ReturnType<typeof prismaMock>;
  let repo: PrismaLedgerRepository;

  function setup() {
    prisma = prismaMock();
    repo = new PrismaLedgerRepository(prisma as unknown as PrismaService);
  }

  it('create persiste el movimiento con los campos dados', async () => {
    setup();
    prisma.ledgerEntry.create.mockResolvedValue(baseRow);
    const entry = await repo.create({ childId: 9, rewardId: 7, kind: 'POINTS', amount: 200, goalId: 3, reason: 'FULFILLED' });
    expect(entry.amount).toBe(200);
    expect(prisma.ledgerEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ childId: 9, kind: 'POINTS', reason: 'FULFILLED' }) }),
    );
  });

  it('sumByChild devuelve 0 si no hay movimientos (_sum.amount null)', async () => {
    setup();
    prisma.ledgerEntry.aggregate.mockResolvedValue({ _sum: { amount: null } });
    const sum = await repo.sumByChild(9, 'MONEY');
    expect(sum).toBe(0);
  });

  it('sumByChild convierte el Decimal agregado a number', async () => {
    setup();
    prisma.ledgerEntry.aggregate.mockResolvedValue({ _sum: { amount: 250 } });
    const sum = await repo.sumByChild(9, 'POINTS');
    expect(sum).toBe(250);
    expect(prisma.ledgerEntry.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { childId: 9, kind: 'POINTS' } }),
    );
  });

  it('sumByGoal agrega por goalId', async () => {
    setup();
    prisma.ledgerEntry.aggregate.mockResolvedValue({ _sum: { amount: 300 } });
    const sum = await repo.sumByGoal(3);
    expect(sum).toBe(300);
    expect(prisma.ledgerEntry.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { goalId: 3 } }),
    );
  });

  it('listByChild filtra por childId', async () => {
    setup();
    prisma.ledgerEntry.findMany.mockResolvedValue([baseRow]);
    const list = await repo.listByChild(9);
    expect(list).toHaveLength(1);
    expect(prisma.ledgerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { childId: 9 } }),
    );
  });
});

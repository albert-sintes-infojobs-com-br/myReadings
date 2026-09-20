import { describe, expect, it, vi } from 'vitest';
import { GetMyStatsUseCase, GetOverviewStatsUseCase } from '../domain/stats/use-cases';
import { DomainNotFound, OwnershipError } from '../domain/shared/domain-errors';
import type { StatsRepository } from '../domain/stats/stats.repository';
import type { GoalRepository } from '../domain/goals/goal.repository';
import type { LedgerRepository } from '../domain/ledger/ledger.repository';
import type { UserRepository } from '../domain/users/user.repository';
import type { Goal } from '../domain/goals/goal.entity';
import type { SafeUser } from '../domain/users/user.entity';
import type { ActorView } from '../domain/shared/actor';

/**
 * Tests de dominio de Estadísticas (Fase 10). TDD: sin NestJS ni Prisma.
 */

const CHILD_ACTOR: ActorView = { id: 9, role: 'CHILD', parentId: 5 };
const PARENT: ActorView = { id: 5, role: 'PARENT', parentId: null };
const OTHER_PARENT: ActorView = { id: 77, role: 'PARENT', parentId: null };
const MY_CHILD: SafeUser = { id: 9, name: 'Lucas', email: 'lucas@test.com', role: 'CHILD', parentId: 5 };
const MY_CHILD_2: SafeUser = { id: 12, name: 'Anaïs', email: 'anais@test.com', role: 'CHILD', parentId: 5 };

function makeGoal(over: Partial<Goal> = {}): Goal {
  return {
    id: 3, childId: 9, createdByParentId: 5, name: 'Videoconsola', description: null,
    targetPoints: 1000, status: 'ACTIVE',
    createdAt: new Date('2026-09-01T10:00:00Z'), updatedAt: new Date('2026-09-01T10:00:00Z'),
    ...over,
  };
}

function statsMock() {
  return {
    booksByStatus: vi.fn().mockResolvedValue({ NOT_STARTED: 1, READING: 1, FINISHED: 2 }),
    finishedBooksByPeriod: vi.fn().mockResolvedValue([{ year: 2026, month: 9, count: 2 }]),
    rewardsByStatus: vi.fn().mockResolvedValue({ PENDING: 1, FULFILLED: 1, PENALIZED: 0 }),
    avgReadingDays: vi.fn().mockResolvedValue(12.5),
  };
}
function goalsMock() {
  return { findById: vi.fn(), listByChild: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn(), delete: vi.fn(), setStatus: vi.fn() };
}
function ledgerMock() {
  return {
    create: vi.fn(),
    sumByChild: vi.fn().mockImplementation((_id: number, kind: string) => Promise.resolve(kind === 'POINTS' ? 450 : 5)),
    sumByGoal: vi.fn().mockResolvedValue(450),
    listByChild: vi.fn(),
  };
}
function usersMock() {
  return { findByEmail: vi.fn(), findById: vi.fn(), listChildren: vi.fn(), createParent: vi.fn(), createChild: vi.fn() };
}

describe('GetMyStatsUseCase', () => {
  it('devuelve las estadísticas del propio hijo (booksByStatus, balance, goalsProgress...)', async () => {
    const stats = statsMock();
    const goals = goalsMock();
    goals.listByChild.mockResolvedValue([makeGoal()]);
    const ledger = ledgerMock();
    const uc = new GetMyStatsUseCase(
      stats as unknown as StatsRepository,
      goals as unknown as GoalRepository,
      ledger as unknown as LedgerRepository,
    );

    const result = await uc.execute(CHILD_ACTOR);

    expect(stats.booksByStatus).toHaveBeenCalledWith(9);
    expect(result.booksByStatus).toEqual({ NOT_STARTED: 1, READING: 1, FINISHED: 2 });
    expect(result.balance).toEqual({ points: 450, money: 5 });
    expect(result.goalsProgress).toEqual([
      { goalId: 3, name: 'Videoconsola', targetPoints: 1000, pointsAccumulated: 450, progressPct: 45 },
    ]);
    expect(result.avgReadingDays).toBe(12.5);
  });

  it('acota progressPct a 100 aunque el acumulado supere el objetivo', async () => {
    const stats = statsMock();
    const goals = goalsMock();
    goals.listByChild.mockResolvedValue([makeGoal({ targetPoints: 100 })]);
    const ledger = ledgerMock();
    ledger.sumByGoal.mockResolvedValue(500); // muy por encima del objetivo
    const uc = new GetMyStatsUseCase(
      stats as unknown as StatsRepository,
      goals as unknown as GoalRepository,
      ledger as unknown as LedgerRepository,
    );

    const result = await uc.execute(CHILD_ACTOR);
    expect(result.goalsProgress[0].progressPct).toBe(100);
  });
});

describe('GetOverviewStatsUseCase', () => {
  function build() {
    const stats = statsMock();
    const goals = goalsMock();
    const ledger = ledgerMock();
    const users = usersMock();
    const uc = new GetOverviewStatsUseCase(
      stats as unknown as StatsRepository,
      goals as unknown as GoalRepository,
      ledger as unknown as LedgerRepository,
      users as unknown as UserRepository,
    );
    return { uc, stats, goals, ledger, users };
  }

  it('con childId: filtra a un hijo propio y NO incluye ranking', async () => {
    const { uc, users } = build();
    users.findById.mockResolvedValue(MY_CHILD);

    const result = await uc.execute(PARENT, 9);

    expect(result.perChild).toHaveLength(1);
    expect(result.perChild[0].childId).toBe(9);
    expect(result.perChild[0].name).toBe('Lucas');
    expect(result.ranking).toBeUndefined();
  });

  it('con childId ajeno → OwnershipError', async () => {
    const { uc, users } = build();
    users.findById.mockResolvedValue(MY_CHILD); // parentId=5, actor=77
    await expect(uc.execute(OTHER_PARENT, 9)).rejects.toThrow(OwnershipError);
  });

  it('con childId inexistente → DomainNotFound', async () => {
    const { uc, users } = build();
    users.findById.mockResolvedValue(null);
    await expect(uc.execute(PARENT, 999)).rejects.toThrow(DomainNotFound);
  });

  it('sin childId: agrega TODOS los hijos e incluye ranking ordenado por libros terminados', async () => {
    const { uc, users, stats } = build();
    users.listChildren.mockResolvedValue([MY_CHILD, MY_CHILD_2]);
    // Anaïs (12) tiene más libros terminados que Lucas (9)
    stats.booksByStatus.mockImplementation((childId: number) =>
      Promise.resolve(childId === 12 ? { NOT_STARTED: 0, READING: 0, FINISHED: 5 } : { NOT_STARTED: 1, READING: 1, FINISHED: 2 }),
    );

    const result = await uc.execute(PARENT);

    expect(result.perChild).toHaveLength(2);
    expect(result.ranking).toBeDefined();
    expect(result.ranking![0].childId).toBe(12); // Anaïs primero (más FINISHED)
    expect(result.ranking![0].finishedBooks).toBe(5);
    expect(result.ranking![1].childId).toBe(9);
  });
});

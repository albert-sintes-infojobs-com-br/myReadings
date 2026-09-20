import type {
  ChildRankingEntry,
  ChildStats,
  ChildStatsWithIdentity,
  GoalProgress,
  OverviewStats,
} from './stats.entity';
import type { StatsRepository } from './stats.repository';
import type { GoalRepository } from '../goals/goal.repository';
import type { LedgerRepository } from '../ledger/ledger.repository';
import type { UserRepository } from '../users/user.repository';
import { assertOwnsChild } from '../goals/use-cases';
import type { ActorView } from '../shared/actor';

/**
 * Use cases de Estadísticas / Dashboards (Fase 10).
 *
 * Reglas de acceso (ver docs/07-dashboards-metricas.md):
 *  - El hijo solo consulta las SUYAS (`GET /stats/me`).
 *  - El padre agrega solo datos de SUS hijos (`GET /stats/overview`):
 *    sin `childId` → todos sus hijos + ranking; con `childId` → filtra
 *    a ese hijo (`assertOwnsChild`, mismo helper que Goals/Ledger).
 *
 * `booksByStatus`/`rewardsByStatus` usan Prisma `groupBy` (agregación en
 * BD); `finishedBooksByPeriod`/`avgReadingDays` se calculan en memoria
 * sobre un `findMany` acotado (Prisma no expresa `YEAR()`/`DATEDIFF()`
 * de forma portable sin `$queryRaw`, y el volumen por hijo es pequeño).
 */

async function computeChildStats(
  childId: number,
  stats: StatsRepository,
  goals: GoalRepository,
  ledger: LedgerRepository,
): Promise<ChildStats> {
  const [booksByStatus, finishedBooksByPeriod, rewardsByStatus, avgReadingDays, points, money, childGoals] =
    await Promise.all([
      stats.booksByStatus(childId),
      stats.finishedBooksByPeriod(childId),
      stats.rewardsByStatus(childId),
      stats.avgReadingDays(childId),
      ledger.sumByChild(childId, 'POINTS'),
      ledger.sumByChild(childId, 'MONEY'),
      goals.listByChild(childId),
    ]);

  const goalsProgress: GoalProgress[] = await Promise.all(
    childGoals.map(async (g) => {
      const accumulated = await ledger.sumByGoal(g.id);
      const progressPct = Math.min(100, Math.round((accumulated / g.targetPoints) * 100));
      return { goalId: g.id, name: g.name, targetPoints: g.targetPoints, pointsAccumulated: accumulated, progressPct };
    }),
  );

  return {
    booksByStatus,
    finishedBooksByPeriod,
    balance: { points, money },
    goalsProgress,
    rewardsByStatus,
    avgReadingDays,
  };
}

export class GetMyStatsUseCase {
  constructor(
    private readonly stats: StatsRepository,
    private readonly goals: GoalRepository,
    private readonly ledger: LedgerRepository,
  ) {}

  async execute(actor: ActorView): Promise<ChildStats> {
    return computeChildStats(actor.id, this.stats, this.goals, this.ledger);
  }
}

export class GetOverviewStatsUseCase {
  constructor(
    private readonly stats: StatsRepository,
    private readonly goals: GoalRepository,
    private readonly ledger: LedgerRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(actor: ActorView, childId?: number): Promise<OverviewStats> {
    if (childId !== undefined) {
      await assertOwnsChild(this.users, actor, childId);
      const child = await this.users.findById(childId);
      const childStats = await computeChildStats(childId, this.stats, this.goals, this.ledger);
      const entry: ChildStatsWithIdentity = { childId, name: child?.name ?? '', ...childStats };
      return { perChild: [entry] };
    }

    const children = await this.users.listChildren(actor.id);
    const perChild: ChildStatsWithIdentity[] = await Promise.all(
      children.map(async (c) => ({
        childId: c.id,
        name: c.name,
        ...(await computeChildStats(c.id, this.stats, this.goals, this.ledger)),
      })),
    );

    const ranking: ChildRankingEntry[] = perChild
      .map((c) => ({
        childId: c.childId,
        name: c.name,
        finishedBooks: c.booksByStatus.FINISHED,
        balance: c.balance,
      }))
      .sort((a, b) => b.finishedBooks - a.finishedBooks);

    return { perChild, ranking };
  }
}

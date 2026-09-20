import type {
  BooksByStatusCount,
  FinishedBooksByPeriodEntry,
  RewardsByStatusCount,
} from './stats.entity';

/** Token de inyección del repo (interfaces no existen en runtime). */
export const STATS_REPOSITORY = 'STATS_REPOSITORY';

/**
 * Contrato de agregaciones de solo-lectura para dashboards.
 *
 * `balance`/`sumByGoal` NO están aquí: los reutiliza `LedgerRepository`
 * (ya implementados en la Fase 8) para no duplicar esa lógica.
 */
export interface StatsRepository {
  /** `COUNT(*)` de Book agrupado por `status` (Prisma `groupBy`). */
  booksByStatus(ownerUserId: number): Promise<BooksByStatusCount>;
  /** Libros `FINISHED` agrupados por año/mes de `endDate`. */
  finishedBooksByPeriod(ownerUserId: number): Promise<FinishedBooksByPeriodEntry[]>;
  /** `COUNT(*)` de Reward (de los libros del hijo) agrupado por `status` (Prisma `groupBy`). */
  rewardsByStatus(ownerUserId: number): Promise<RewardsByStatusCount>;
  /** Media de días entre `startDate` y `endDate` de libros `FINISHED` con ambas fechas. */
  avgReadingDays(ownerUserId: number): Promise<number | null>;
}

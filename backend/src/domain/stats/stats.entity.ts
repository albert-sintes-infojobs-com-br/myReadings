/**
 * Formas de resultado de las estadísticas (Fase 10).
 * Sin dependencias de NestJS ni Prisma.
 */
import type { Balance } from '../ledger/use-cases';

export interface BooksByStatusCount {
  NOT_STARTED: number;
  READING: number;
  FINISHED: number;
}

export interface FinishedBooksByPeriodEntry {
  year: number;
  month: number;
  count: number;
}

export interface RewardsByStatusCount {
  PENDING: number;
  FULFILLED: number;
  PENALIZED: number;
}

export interface GoalProgress {
  goalId: number;
  name: string;
  targetPoints: number;
  pointsAccumulated: number;
  /** 0-100, acotado (no supera 100 aunque el acumulado exceda el objetivo). */
  progressPct: number;
}

export interface ChildStats {
  booksByStatus: BooksByStatusCount;
  finishedBooksByPeriod: FinishedBooksByPeriodEntry[];
  balance: Balance;
  goalsProgress: GoalProgress[];
  rewardsByStatus: RewardsByStatusCount;
  /** `null` si no hay libros FINISHED con ambas fechas informadas. */
  avgReadingDays: number | null;
}

export interface ChildStatsWithIdentity extends ChildStats {
  childId: number;
  name: string;
}

export interface ChildRankingEntry {
  childId: number;
  name: string;
  finishedBooks: number;
  balance: Balance;
}

export interface OverviewStats {
  perChild: ChildStatsWithIdentity[];
  /** Solo presente cuando se piden TODOS los hijos (sin `childId`). */
  ranking?: ChildRankingEntry[];
}

import type { Balance } from './ledger';

export interface BooksByStatusCount {
  NOT_STARTED: number;
  READING: number;
  FINISHED: number;
}

export interface RewardsByStatusCount {
  PENDING: number;
  FULFILLED: number;
  PENALIZED: number;
}

export interface FinishedBooksByPeriod {
  year: number;
  month: number;
  count: number;
}

export interface GoalProgress {
  goalId: number;
  name: string;
  targetPoints: number;
  pointsAccumulated: number;
  progressPct: number;
}

export interface ChildStats {
  booksByStatus: BooksByStatusCount;
  finishedBooksByPeriod: FinishedBooksByPeriod[];
  balance: Balance;
  goalsProgress: GoalProgress[];
  rewardsByStatus: RewardsByStatusCount;
  avgReadingDays: number | null;
}

export interface ChildRankingEntry {
  childId: number;
  name: string;
  finishedBooks: number;
  balance: Balance;
}

export interface OverviewStats {
  perChild: Array<ChildStats & { childId: number; name: string }>;
  ranking?: ChildRankingEntry[];
}

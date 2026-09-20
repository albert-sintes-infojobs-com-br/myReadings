export type LedgerKind = 'POINTS' | 'MONEY';
export type LedgerReason = 'FULFILLED' | 'PENALTY' | 'REDEMPTION';

export interface Balance {
  points: number;
  money: number;
}

export interface LedgerEntry {
  id: number;
  childId: number;
  rewardId: number | null;
  kind: LedgerKind;
  amount: number;
  goalId: number | null;
  reason: LedgerReason;
  createdAt: string;
}

export interface ChildLedger {
  balance: Balance;
  entries: LedgerEntry[];
}

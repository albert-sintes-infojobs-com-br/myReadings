export type RewardType = 'POINTS' | 'MONEY';
export type RewardStatus = 'PENDING' | 'FULFILLED' | 'PENALIZED';

export interface Reward {
  id: number;
  bookId: number;
  createdByParentId: number;
  type: RewardType;
  value: number;
  deadline: string;
  penaltyValue: number | null;
  goalId: number | null;
  status: RewardStatus;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

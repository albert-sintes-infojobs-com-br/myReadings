export type RewardRequestStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED';

export interface RewardRequest {
  id: number;
  bookId: number;
  childId: number;
  status: RewardRequestStatus;
  createdAt: string;
  resolvedAt: string | null;
}

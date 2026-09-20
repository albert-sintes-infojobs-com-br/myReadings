/**
 * Entidad de dominio: Recompensa (Reward), asociada a un libro.
 *
 * Sin dependencias de NestJS ni Prisma. `deadline` como string ISO
 * `YYYY-MM-DD` (mismo criterio que `Book.startDate`/`endDate`).
 */
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
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

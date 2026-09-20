export type GoalStatus = 'ACTIVE' | 'ACHIEVED' | 'REDEEMED';

export interface Goal {
  id: number;
  childId: number;
  createdByParentId: number;
  name: string;
  description: string | null;
  targetPoints: number;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

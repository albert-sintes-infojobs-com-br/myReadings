/**
 * Entidad de dominio: Meta (Goal) canjeable.
 *
 * Sin dependencias de NestJS ni Prisma. `childId`/`createdByParentId`
 * enlazan con la entidad User del dominio `users` (no se duplica aquí).
 */
export type GoalStatus = 'ACTIVE' | 'ACHIEVED' | 'REDEEMED';

export interface Goal {
  id: number;
  childId: number;
  createdByParentId: number;
  name: string;
  description: string | null;
  targetPoints: number;
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
}

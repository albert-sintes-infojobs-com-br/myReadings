/**
 * Entidad de dominio: Notificación in-app.
 * Sin dependencias de NestJS ni Prisma.
 */
export type NotificationType =
  | 'REWARD_REQUEST'
  | 'REWARD_FULFILLED'
  | 'REWARD_PENALIZED'
  | 'GOAL_ACHIEVED';

export interface Notification {
  id: number;
  recipientUserId: number;
  type: NotificationType;
  refBookId: number | null;
  refRewardId: number | null;
  message: string;
  read: boolean;
  hidden: boolean;
  createdAt: Date;
}

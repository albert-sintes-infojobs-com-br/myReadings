import type { Notification, NotificationType } from './notification.entity';

/** Token de inyección del repo (interfaces no existen en runtime). */
export const NOTIFICATION_REPOSITORY = 'NOTIFICATION_REPOSITORY';

export interface CreateNotificationInput {
  recipientUserId: number;
  type: NotificationType;
  refBookId?: number | null;
  refRewardId?: number | null;
  message: string;
}

/**
 * Contrato de acceso a persistencia de notificaciones.
 * Otros dominios (ledger, reward-requests) crean notificaciones a través
 * de este repositorio; nunca conocen NestJS/Prisma.
 */
export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<Notification>;
  findById(id: number): Promise<Notification | null>;
  /** `onlyUnread` filtra a `read = false` si se indica `true`. */
  listByRecipient(recipientUserId: number, onlyUnread?: boolean): Promise<Notification[]>;
  countUnread(recipientUserId: number): Promise<number>;
  markRead(id: number): Promise<Notification>;
  /** Devuelve el número de notificaciones actualizadas. */
  markAllRead(recipientUserId: number): Promise<number>;
}

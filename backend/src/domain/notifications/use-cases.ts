import type { Notification } from './notification.entity';
import type { NotificationRepository } from './notification.repository';
import { DomainNotFound } from '../shared/domain-errors';
import type { ActorView } from '../shared/actor';

/**
 * Use cases de Notificaciones (Fase 9).
 *
 * Bandeja in-app: cada usuario (padre o hijo) solo ve/gestiona las SUYAS
 * (`recipientUserId === actor.id`). Las notificaciones las CREAN otros
 * dominios (reward-requests al solicitar; ledger al resolver recompensas
 * o alcanzar metas) — este dominio solo expone lectura y marcado.
 */

export class ListMyNotificationsUseCase {
  constructor(private readonly notifications: NotificationRepository) {}

  async execute(actor: ActorView, onlyUnread?: boolean): Promise<Notification[]> {
    return this.notifications.listByRecipient(actor.id, onlyUnread);
  }
}

export class CountUnreadNotificationsUseCase {
  constructor(private readonly notifications: NotificationRepository) {}

  async execute(actor: ActorView): Promise<number> {
    return this.notifications.countUnread(actor.id);
  }
}

export class MarkNotificationReadUseCase {
  constructor(private readonly notifications: NotificationRepository) {}

  async execute(actor: ActorView, id: number): Promise<Notification> {
    const notification = await this.notifications.findById(id);
    if (!notification || notification.recipientUserId !== actor.id) {
      // Privacidad: no revela si la notificación existe para otro usuario.
      throw new DomainNotFound('Notificación no encontrada', 'notification');
    }
    return this.notifications.markRead(id);
  }
}

export class MarkAllNotificationsReadUseCase {
  constructor(private readonly notifications: NotificationRepository) {}

  async execute(actor: ActorView): Promise<number> {
    return this.notifications.markAllRead(actor.id);
  }
}

export class HideNotificationUseCase {
  constructor(private readonly notifications: NotificationRepository) {}

  async execute(actor: ActorView, id: number): Promise<Notification> {
    const notification = await this.notifications.findById(id);
    if (!notification || notification.recipientUserId !== actor.id) {
      throw new DomainNotFound('Notificación no encontrada', 'notification');
    }
    return this.notifications.hide(id);
  }
}

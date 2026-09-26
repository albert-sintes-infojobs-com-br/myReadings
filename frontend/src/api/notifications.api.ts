import { apiClient } from './client';

export type NotificationType =
  | 'REWARD_REQUEST'
  | 'REWARD_FULFILLED'
  | 'REWARD_PENALIZED'
  | 'GOAL_ACHIEVED';

export interface NotificationDto {
  id: number;
  recipientUserId: number;
  type: NotificationType;
  refBookId: number | null;
  refRewardId: number | null;
  message: string;
  read: boolean;
  hidden: boolean;
  createdAt: string;
}

export async function listNotifications(onlyUnread?: boolean): Promise<NotificationDto[]> {
  const { data } = await apiClient.get<NotificationDto[]>('/notifications', {
    params: onlyUnread !== undefined ? { unread: onlyUnread } : undefined,
  });
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count');
  return data.count;
}

export async function markNotificationRead(id: number): Promise<NotificationDto> {
  const { data } = await apiClient.patch<NotificationDto>(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead(): Promise<number> {
  const { data } = await apiClient.patch<{ updated: number }>('/notifications/read-all');
  return data.updated;
}

/** Borrado lógico: deja de listarse (no se elimina el registro en BD). */
export async function hideNotification(id: number): Promise<void> {
  await apiClient.delete(`/notifications/${id}`);
}

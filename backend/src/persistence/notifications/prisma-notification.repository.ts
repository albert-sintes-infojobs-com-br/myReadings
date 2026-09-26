import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Notification } from '../../domain/notifications/notification.entity';
import type {
  CreateNotificationInput,
  NotificationRepository,
} from '../../domain/notifications/notification.repository';

const SELECT = {
  id: true,
  recipientUserId: true,
  type: true,
  refBookId: true,
  refRewardId: true,
  message: true,
  read: true,
  hidden: true,
  createdAt: true,
} as const;

/** Implementación Prisma del contrato `NotificationRepository`. */
@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toNotification(row: {
    id: number;
    recipientUserId: number;
    type: string;
    refBookId: number | null;
    refRewardId: number | null;
    message: string;
    read: boolean;
    hidden: boolean;
    createdAt: Date;
  }): Notification {
    return { ...row, type: row.type as Notification['type'] };
  }

  async create(input: CreateNotificationInput): Promise<Notification> {
    const row = await this.prisma.notification.create({
      data: {
        recipientUserId: input.recipientUserId,
        type: input.type,
        refBookId: input.refBookId ?? null,
        refRewardId: input.refRewardId ?? null,
        message: input.message,
      },
      select: SELECT,
    });
    return this.toNotification(row);
  }

  async findById(id: number): Promise<Notification | null> {
    const row = await this.prisma.notification.findUnique({ where: { id }, select: SELECT });
    return row ? this.toNotification(row) : null;
  }

  async listByRecipient(recipientUserId: number, onlyUnread?: boolean): Promise<Notification[]> {
    const rows = await this.prisma.notification.findMany({
      where: { recipientUserId, hidden: false, ...(onlyUnread ? { read: false } : {}) },
      select: SELECT,
      orderBy: { id: 'desc' },
    });
    return rows.map((r) => this.toNotification(r));
  }

  async countUnread(recipientUserId: number): Promise<number> {
    return this.prisma.notification.count({ where: { recipientUserId, read: false } });
  }

  async markRead(id: number): Promise<Notification> {
    const row = await this.prisma.notification.update({ where: { id }, data: { read: true }, select: SELECT });
    return this.toNotification(row);
  }

  async markAllRead(recipientUserId: number): Promise<number> {
    const { count } = await this.prisma.notification.updateMany({
      where: { recipientUserId, read: false },
      data: { read: true },
    });
    return count;
  }

  async hide(id: number): Promise<Notification> {
    const row = await this.prisma.notification.update({ where: { id }, data: { hidden: true }, select: SELECT });
    return this.toNotification(row);
  }
}

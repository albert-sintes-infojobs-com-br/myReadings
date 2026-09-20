import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { ActorResolver } from '../shared/actor-resolver';
import { PrismaNotificationRepository } from '../../persistence/notifications/prisma-notification.repository';
import {
  CountUnreadNotificationsUseCase,
  ListMyNotificationsUseCase,
  MarkAllNotificationsReadUseCase,
  MarkNotificationReadUseCase,
} from '../../domain/notifications/use-cases';
import { NOTIFICATION_REPOSITORY } from '../../domain/notifications/notification.repository';

/** Módulo de transporte (NestJS) de Notificaciones (Fase 9). */
const notificationUseCases = [
  ListMyNotificationsUseCase,
  CountUnreadNotificationsUseCase,
  MarkNotificationReadUseCase,
  MarkAllNotificationsReadUseCase,
];

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [
    PrismaNotificationRepository,
    ActorResolver,
    { provide: NOTIFICATION_REPOSITORY, useExisting: PrismaNotificationRepository },
    ...notificationUseCases.map((uc) => ({
      provide: uc,
      useFactory: (repo: unknown) => new uc(repo as never),
      inject: [NOTIFICATION_REPOSITORY],
    })),
  ],
  exports: [NOTIFICATION_REPOSITORY],
})
export class NotificationsModule {}

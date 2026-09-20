import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RewardRequestsController } from './reward-requests.controller';
import { ActorResolver } from '../shared/actor-resolver';
import { PrismaRewardRequestRepository } from '../../persistence/reward-requests/prisma-reward-request.repository';
import { PrismaBookRepository } from '../../persistence/books/prisma-book.repository';
import { PrismaNotificationRepository } from '../../persistence/notifications/prisma-notification.repository';
import {
  CreateRewardRequestUseCase,
  ListPendingRewardRequestsUseCase,
  ResolveRewardRequestUseCase,
} from '../../domain/reward-requests/use-cases';
import { REWARD_REQUEST_REPOSITORY } from '../../domain/reward-requests/reward-request.repository';
import { BOOK_REPOSITORY } from '../../domain/books/book.repository';
import { NOTIFICATION_REPOSITORY } from '../../domain/notifications/notification.repository';
import { USER_REPOSITORY } from '../../domain/users/user.repository';

/**
 * Módulo de transporte (NestJS) de Solicitudes de recompensa (Fase 9).
 * Self-contained como Rewards/Ledger: provee sus propias instancias de
 * `PrismaBookRepository`/`PrismaNotificationRepository` y reusa
 * `USER_REPOSITORY` de `AuthModule`.
 */
@Module({
  imports: [AuthModule],
  controllers: [RewardRequestsController],
  providers: [
    PrismaRewardRequestRepository,
    PrismaBookRepository,
    PrismaNotificationRepository,
    ActorResolver,
    { provide: REWARD_REQUEST_REPOSITORY, useExisting: PrismaRewardRequestRepository },
    { provide: BOOK_REPOSITORY, useExisting: PrismaBookRepository },
    { provide: NOTIFICATION_REPOSITORY, useExisting: PrismaNotificationRepository },
    {
      provide: CreateRewardRequestUseCase,
      useFactory: (requests: unknown, books: unknown, notifications: unknown) =>
        new CreateRewardRequestUseCase(requests as never, books as never, notifications as never),
      inject: [REWARD_REQUEST_REPOSITORY, BOOK_REPOSITORY, NOTIFICATION_REPOSITORY],
    },
    {
      provide: ListPendingRewardRequestsUseCase,
      useFactory: (requests: unknown) => new ListPendingRewardRequestsUseCase(requests as never),
      inject: [REWARD_REQUEST_REPOSITORY],
    },
    {
      provide: ResolveRewardRequestUseCase,
      useFactory: (requests: unknown, users: unknown) =>
        new ResolveRewardRequestUseCase(requests as never, users as never),
      inject: [REWARD_REQUEST_REPOSITORY, USER_REPOSITORY],
    },
  ],
})
export class RewardRequestsModule {}

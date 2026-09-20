import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LedgerController } from './ledger.controller';
import { RewardPenalizationScheduler } from './reward-penalization.scheduler';
import { ActorResolver } from '../shared/actor-resolver';
import { PrismaLedgerRepository } from '../../persistence/ledger/prisma-ledger.repository';
import { PrismaGoalRepository } from '../../persistence/goals/prisma-goal.repository';
import { PrismaRewardRepository } from '../../persistence/rewards/prisma-reward.repository';
import { PrismaBookRepository } from '../../persistence/books/prisma-book.repository';
import { PrismaNotificationRepository } from '../../persistence/notifications/prisma-notification.repository';
import {
  GetChildLedgerUseCase,
  GetMyBalanceUseCase,
  PenalizeOverdueRewardsUseCase,
  RedeemGoalUseCase,
} from '../../domain/ledger/use-cases';
import { LEDGER_REPOSITORY } from '../../domain/ledger/ledger.repository';
import { GOAL_REPOSITORY } from '../../domain/goals/goal.repository';
import { REWARD_REPOSITORY } from '../../domain/rewards/reward.repository';
import { BOOK_REPOSITORY } from '../../domain/books/book.repository';
import { NOTIFICATION_REPOSITORY } from '../../domain/notifications/notification.repository';
import { USER_REPOSITORY } from '../../domain/users/user.repository';

/**
 * Módulo de transporte (NestJS) del Ledger + motor de resolución (Fase 8).
 *
 * Self-contained como Rewards: provee sus PROPIAS instancias de
 * `PrismaGoalRepository`/`PrismaRewardRepository`/`PrismaBookRepository`
 * (esos módulos no exportan sus tokens) y reusa `USER_REPOSITORY` de
 * `AuthModule`. Registra además `RewardPenalizationScheduler` (`@Cron`
 * diario) que ejecuta `PenalizeOverdueRewardsUseCase`.
 */
@Module({
  imports: [AuthModule],
  controllers: [LedgerController],
  providers: [
    PrismaLedgerRepository,
    PrismaGoalRepository,
    PrismaRewardRepository,
    PrismaBookRepository,
    PrismaNotificationRepository,
    ActorResolver,
    RewardPenalizationScheduler,
    { provide: LEDGER_REPOSITORY, useExisting: PrismaLedgerRepository },
    { provide: GOAL_REPOSITORY, useExisting: PrismaGoalRepository },
    { provide: REWARD_REPOSITORY, useExisting: PrismaRewardRepository },
    { provide: BOOK_REPOSITORY, useExisting: PrismaBookRepository },
    { provide: NOTIFICATION_REPOSITORY, useExisting: PrismaNotificationRepository },
    {
      provide: GetMyBalanceUseCase,
      useFactory: (ledger: unknown) => new GetMyBalanceUseCase(ledger as never),
      inject: [LEDGER_REPOSITORY],
    },
    {
      provide: GetChildLedgerUseCase,
      useFactory: (ledger: unknown, users: unknown) => new GetChildLedgerUseCase(ledger as never, users as never),
      inject: [LEDGER_REPOSITORY, USER_REPOSITORY],
    },
    {
      provide: RedeemGoalUseCase,
      useFactory: (goals: unknown, ledger: unknown, users: unknown) =>
        new RedeemGoalUseCase(goals as never, ledger as never, users as never),
      inject: [GOAL_REPOSITORY, LEDGER_REPOSITORY, USER_REPOSITORY],
    },
    {
      provide: PenalizeOverdueRewardsUseCase,
      useFactory: (rewards: unknown, books: unknown, goals: unknown, ledger: unknown, notifications: unknown) =>
        new PenalizeOverdueRewardsUseCase(rewards as never, books as never, goals as never, ledger as never, notifications as never),
      inject: [REWARD_REPOSITORY, BOOK_REPOSITORY, GOAL_REPOSITORY, LEDGER_REPOSITORY, NOTIFICATION_REPOSITORY],
    },
  ],
})
export class LedgerModule {}

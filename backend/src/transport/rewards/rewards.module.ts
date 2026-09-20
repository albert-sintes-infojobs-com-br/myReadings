import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RewardsController } from './rewards.controller';
import { ActorResolver } from '../shared/actor-resolver';
import { PrismaRewardRepository } from '../../persistence/rewards/prisma-reward.repository';
import { PrismaBookRepository } from '../../persistence/books/prisma-book.repository';
import { PrismaGoalRepository } from '../../persistence/goals/prisma-goal.repository';
import {
  CreateRewardUseCase,
  DeleteRewardUseCase,
  GetRewardUseCase,
  ListRewardsUseCase,
  UpdateRewardUseCase,
} from '../../domain/rewards/use-cases';
import { REWARD_REPOSITORY } from '../../domain/rewards/reward.repository';
import { BOOK_REPOSITORY } from '../../domain/books/book.repository';
import { GOAL_REPOSITORY } from '../../domain/goals/goal.repository';
import { USER_REPOSITORY } from '../../domain/users/user.repository';

/**
 * Módulo de transporte (NestJS) de Recompensas (Fase 7).
 *
 * Self-contained como Categories/Books/Goals: provee sus PROPIAS instancias
 * de `PrismaBookRepository`/`PrismaGoalRepository` (sin importar
 * BooksModule/GoalsModule, que no exportan sus tokens) y reusa
 * `USER_REPOSITORY` ya exportado por `AuthModule`.
 */
const threeRepoUseCases = [CreateRewardUseCase, UpdateRewardUseCase];
const twoRepoUseCases = [GetRewardUseCase, DeleteRewardUseCase];

@Module({
  imports: [AuthModule],
  controllers: [RewardsController],
  providers: [
    PrismaRewardRepository,
    PrismaBookRepository,
    PrismaGoalRepository,
    ActorResolver,
    { provide: REWARD_REPOSITORY, useExisting: PrismaRewardRepository },
    { provide: BOOK_REPOSITORY, useExisting: PrismaBookRepository },
    { provide: GOAL_REPOSITORY, useExisting: PrismaGoalRepository },
    ...threeRepoUseCases.map((uc) => ({
      provide: uc,
      useFactory: (rewards: unknown, books: unknown, goals: unknown, users: unknown) =>
        new uc(rewards as never, books as never, goals as never, users as never),
      inject: [REWARD_REPOSITORY, BOOK_REPOSITORY, GOAL_REPOSITORY, USER_REPOSITORY],
    })),
    ...twoRepoUseCases.map((uc) => ({
      provide: uc,
      useFactory: (rewards: unknown, books: unknown, users: unknown) =>
        new uc(rewards as never, books as never, users as never),
      inject: [REWARD_REPOSITORY, BOOK_REPOSITORY, USER_REPOSITORY],
    })),
    {
      provide: ListRewardsUseCase,
      useFactory: (rewards: unknown) => new ListRewardsUseCase(rewards as never),
      inject: [REWARD_REPOSITORY],
    },
  ],
})
export class RewardsModule {}

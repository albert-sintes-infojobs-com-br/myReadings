import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BooksController } from './books.controller';
import { ActorResolver } from '../shared/actor-resolver';
import { PrismaBookRepository } from '../../persistence/books/prisma-book.repository';
import { PrismaRewardRepository } from '../../persistence/rewards/prisma-reward.repository';
import { PrismaGoalRepository } from '../../persistence/goals/prisma-goal.repository';
import { PrismaLedgerRepository } from '../../persistence/ledger/prisma-ledger.repository';
import { PrismaNotificationRepository } from '../../persistence/notifications/prisma-notification.repository';
import {
  CreateBookUseCase,
  DeleteBookUseCase,
  GetBookUseCase,
  ListBooksUseCase,
  UpdateBookUseCase,
} from '../../domain/books/use-cases';
import { ResolveBookFinishedUseCase } from '../../domain/ledger/use-cases';
import { BOOK_REPOSITORY } from '../../domain/books/book.repository';
import { REWARD_REPOSITORY } from '../../domain/rewards/reward.repository';
import { GOAL_REPOSITORY } from '../../domain/goals/goal.repository';
import { LEDGER_REPOSITORY } from '../../domain/ledger/ledger.repository';
import { NOTIFICATION_REPOSITORY } from '../../domain/notifications/notification.repository';

/**
 * Módulo de transporte (NestJS) de Libros (Fase 5).
 * Mismo patrón de DI por token que Categories (ver ese módulo para detalle).
 *
 * Fase 8: también provee (self-contained, como Rewards/Ledger) sus PROPIOS
 * `PrismaRewardRepository`/`PrismaGoalRepository`/`PrismaLedgerRepository`
 * para `ResolveBookFinishedUseCase`, invocado desde `BooksController`
 * cuando un `PATCH /books/:id` deja el libro en `FINISHED`.
 */
const bookUseCases = [
  CreateBookUseCase,
  ListBooksUseCase,
  GetBookUseCase,
  UpdateBookUseCase,
  DeleteBookUseCase,
];

@Module({
  imports: [AuthModule],
  controllers: [BooksController],
  providers: [
    PrismaBookRepository,
    PrismaRewardRepository,
    PrismaGoalRepository,
    PrismaLedgerRepository,
    PrismaNotificationRepository,
    ActorResolver,
    { provide: BOOK_REPOSITORY, useExisting: PrismaBookRepository },
    { provide: REWARD_REPOSITORY, useExisting: PrismaRewardRepository },
    { provide: GOAL_REPOSITORY, useExisting: PrismaGoalRepository },
    { provide: LEDGER_REPOSITORY, useExisting: PrismaLedgerRepository },
    { provide: NOTIFICATION_REPOSITORY, useExisting: PrismaNotificationRepository },
    ...bookUseCases.map((uc) => ({
      provide: uc,
      useFactory: (repo: unknown) => new uc(repo as never),
      inject: [BOOK_REPOSITORY],
    })),
    {
      provide: ResolveBookFinishedUseCase,
      useFactory: (rewards: unknown, books: unknown, goals: unknown, ledger: unknown, notifications: unknown) =>
        new ResolveBookFinishedUseCase(rewards as never, books as never, goals as never, ledger as never, notifications as never),
      inject: [REWARD_REPOSITORY, BOOK_REPOSITORY, GOAL_REPOSITORY, LEDGER_REPOSITORY, NOTIFICATION_REPOSITORY],
    },
  ],
})
export class BooksModule {}

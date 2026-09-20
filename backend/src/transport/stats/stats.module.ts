import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StatsController } from './stats.controller';
import { ActorResolver } from '../shared/actor-resolver';
import { PrismaStatsRepository } from '../../persistence/stats/prisma-stats.repository';
import { PrismaGoalRepository } from '../../persistence/goals/prisma-goal.repository';
import { PrismaLedgerRepository } from '../../persistence/ledger/prisma-ledger.repository';
import { GetMyStatsUseCase, GetOverviewStatsUseCase } from '../../domain/stats/use-cases';
import { STATS_REPOSITORY } from '../../domain/stats/stats.repository';
import { GOAL_REPOSITORY } from '../../domain/goals/goal.repository';
import { LEDGER_REPOSITORY } from '../../domain/ledger/ledger.repository';
import { USER_REPOSITORY } from '../../domain/users/user.repository';

/**
 * Módulo de transporte (NestJS) de Estadísticas (Fase 10).
 * Self-contained como Rewards/Ledger: provee sus propias instancias de
 * `PrismaGoalRepository`/`PrismaLedgerRepository` y reusa `USER_REPOSITORY`
 * de `AuthModule`.
 */
@Module({
  imports: [AuthModule],
  controllers: [StatsController],
  providers: [
    PrismaStatsRepository,
    PrismaGoalRepository,
    PrismaLedgerRepository,
    ActorResolver,
    { provide: STATS_REPOSITORY, useExisting: PrismaStatsRepository },
    { provide: GOAL_REPOSITORY, useExisting: PrismaGoalRepository },
    { provide: LEDGER_REPOSITORY, useExisting: PrismaLedgerRepository },
    {
      provide: GetMyStatsUseCase,
      useFactory: (stats: unknown, goals: unknown, ledger: unknown) =>
        new GetMyStatsUseCase(stats as never, goals as never, ledger as never),
      inject: [STATS_REPOSITORY, GOAL_REPOSITORY, LEDGER_REPOSITORY],
    },
    {
      provide: GetOverviewStatsUseCase,
      useFactory: (stats: unknown, goals: unknown, ledger: unknown, users: unknown) =>
        new GetOverviewStatsUseCase(stats as never, goals as never, ledger as never, users as never),
      inject: [STATS_REPOSITORY, GOAL_REPOSITORY, LEDGER_REPOSITORY, USER_REPOSITORY],
    },
  ],
})
export class StatsModule {}

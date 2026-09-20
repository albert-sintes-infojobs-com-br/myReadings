import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GoalsController } from './goals.controller';
import { ActorResolver } from '../shared/actor-resolver';
import { PrismaGoalRepository } from '../../persistence/goals/prisma-goal.repository';
import {
  CreateGoalUseCase,
  DeleteGoalUseCase,
  ListChildGoalsUseCase,
  ListMyGoalsUseCase,
  UpdateGoalUseCase,
} from '../../domain/goals/use-cases';
import { GOAL_REPOSITORY } from '../../domain/goals/goal.repository';
import { USER_REPOSITORY } from '../../domain/users/user.repository';

/**
 * Módulo de transporte (NestJS) de Metas (Fase 6).
 *
 * A diferencia de Categories/Books, la mayoría de use cases dependen de
 * DOS repos (`GoalRepository` + `UserRepository`, este último para
 * comprobar "¿es mi hijo?"). `USER_REPOSITORY` ya lo exporta `AuthModule`
 * (mismo `PrismaUserRepository`, sin duplicar wiring).
 */
const twoRepoUseCases = [CreateGoalUseCase, ListChildGoalsUseCase, UpdateGoalUseCase, DeleteGoalUseCase];

@Module({
  imports: [AuthModule],
  controllers: [GoalsController],
  providers: [
    PrismaGoalRepository,
    ActorResolver,
    { provide: GOAL_REPOSITORY, useExisting: PrismaGoalRepository },
    ...twoRepoUseCases.map((uc) => ({
      provide: uc,
      useFactory: (goals: unknown, users: unknown) => new uc(goals as never, users as never),
      inject: [GOAL_REPOSITORY, USER_REPOSITORY],
    })),
    {
      provide: ListMyGoalsUseCase,
      useFactory: (goals: unknown) => new ListMyGoalsUseCase(goals as never),
      inject: [GOAL_REPOSITORY],
    },
  ],
})
export class GoalsModule {}

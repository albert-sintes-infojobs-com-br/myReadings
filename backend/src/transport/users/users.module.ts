import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';
import { USER_REPOSITORY } from '../../domain/users/user.repository';
import { CreateChildUseCase, ListChildrenUseCase } from '../../domain/users/use-cases';

/**
 * Módulo de transporte (NestJS) de Users (gestión de hijos).
 *
 * Reutiliza `USER_REPOSITORY` y `GetMeUseCase` exportados por `AuthModule`
 * (mismo repo Prisma, sin duplicar wiring); solo define aquí los use cases
 * propios de esta ruta (ListChildren, CreateChild).
 */
const usersOwnUseCases = [ListChildrenUseCase, CreateChildUseCase];

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [
    ...usersOwnUseCases.map((uc) => ({
      provide: uc,
      useFactory: (repo: unknown) => new uc(repo as never),
      inject: [USER_REPOSITORY],
    })),
  ],
})
export class UsersModule {}

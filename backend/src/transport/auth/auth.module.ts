import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaUserRepository } from '../../persistence/users/prisma-user.repository';
import { USER_REPOSITORY } from '../../domain/users/user.repository';
import {
  GetMeUseCase,
  LoginUseCase,
  RegisterParentUseCase,
} from '../../domain/users/use-cases';

/**
 * Módulo de transporte (NestJS) de Auth.
 *
 * Alambre (DI) igual que Categories: los use cases reciben `UserRepository`
 * (interfaz, sin existencia en runtime) → token USER_REPOSITORY +
 * `useFactory` para instanciar manualmente cada use case.
 */
const authUseCases = [RegisterParentUseCase, LoginUseCase, GetMeUseCase];

@Module({
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    PrismaUserRepository,
    { provide: USER_REPOSITORY, useExisting: PrismaUserRepository },
    ...authUseCases.map((uc) => ({
      provide: uc,
      useFactory: (repo: unknown) => new uc(repo as never),
      inject: [USER_REPOSITORY],
    })),
  ],
  exports: [PassportModule, USER_REPOSITORY, ...authUseCases],
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret-cambiar'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '1h') },
      }),
    }),
  ],
})
export class AuthModule {}

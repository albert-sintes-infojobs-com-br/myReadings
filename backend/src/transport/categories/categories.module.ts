import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoriesController } from './categories.controller';
import { ActorResolver } from '../shared/actor-resolver';
import { PrismaCategoryRepository } from '../../persistence/categories/prisma-category.repository';
import {
  CreateCategoryUseCase,
  DeleteCategoryUseCase,
  GetCategoryUseCase,
  ListCategoriesUseCase,
  UpdateCategoryUseCase,
} from '../../domain/categories/use-cases';
import { CATEGORY_REPOSITORY } from '../../domain/categories/category.repository';

/**
 * Módulo de transporte (NestJS) de Categorías (Fase 4).
 *
 * Alambre (DI):
 *   PrismaService (global)  →  PrismaCategoryRepository  →  use cases  →  controller
 *
 * IMPORTA: los use cases reciben `CategoryRepository` (una INTERFAZ, que no
 * existe en runtime). La inyección de Nest vía design:paramtypes no puede
 * usarla como token, así que se cablea explícitamente:
 *   - token CATEGORY_REPOSITORY → useExisting PrismaCategoryRepository
 *   - cada use case con useFactory (instanciación manual)
 */
const categoryUseCases = [
  CreateCategoryUseCase,
  ListCategoriesUseCase,
  GetCategoryUseCase,
  UpdateCategoryUseCase,
  DeleteCategoryUseCase,
];

@Module({
  imports: [AuthModule],
  controllers: [CategoriesController],
  providers: [
    PrismaCategoryRepository,
    ActorResolver,
    { provide: CATEGORY_REPOSITORY, useExisting: PrismaCategoryRepository },
    ...categoryUseCases.map((uc) => ({
      provide: uc,
      useFactory: (repo: unknown) => new uc(repo as never),
      inject: [CATEGORY_REPOSITORY],
    })),
  ],
})
export class CategoriesModule {}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  Category,
 } from '../../domain/categories/category.entity';
import type {
  CategoryRepository,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../../domain/categories/category.repository';

/**
 * Implementación Prisma del contrato `CategoryRepository`.
 *
 * Convenciones fijas:
 *  - CADA query filtra por `ownerUserId`: un usuario jamás ve/carga
 *    categorías de otro propietario (salvo la vista explícita hijo→padre
 *    de `listByOwner`).
 *  - La entidad devuelta es el shape del dominio, no el de Prisma.
 */
@Injectable()
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toCategory(row: {
    id: number;
    ownerUserId: number;
    title: string;
    description: string | null;
    colorHex: string;
    createdAt: Date;
  }): Category {
    return row;
  }

  private static readonly SELECT = {
    id: true,
    ownerUserId: true,
    title: true,
    description: true,
    colorHex: true,
    createdAt: true,
  } as const;

  async findById(
    id: number,
    ownerUserId: number,
  ): Promise<Category | null> {
    const row = await this.prisma.category.findFirst({
      where: { id, ownerUserId },
      select: PrismaCategoryRepository.SELECT,
    });
    return row ? this.toCategory(row) : null;
  }

  async listByOwner(
    ownerUserId: number,
    parentUserId?: number,
  ): Promise<Category[]> {
    const ownerIds =
      parentUserId != null ? Array.from(new Set([ownerUserId, parentUserId])) : [ownerUserId];

    // Dos queries en vez de una `in`: el resultado debe tener las del
    // propietario ANTES que las del padre (orden estable sin joins).
    const byOwner = await this.prisma.category.findMany({
      where: { ownerUserId },
      select: PrismaCategoryRepository.SELECT,
      orderBy: { id: 'asc' },
    });
    const extras =
      parentUserId != null && parentUserId !== ownerUserId
        ? await this.prisma.category.findMany({
            where: { ownerUserId: parentUserId },
            select: PrismaCategoryRepository.SELECT,
            orderBy: { id: 'asc' },
          })
        : [];
    return [...byOwner, ...extras].map((r) => this.toCategory(r));
  }

  async create(
    input: CreateCategoryInput,
    ownerUserId: number,
  ): Promise<Category> {
    const row = await this.prisma.category.create({
      data: {
        title: input.title,
        colorHex: input.colorHex,
        description: input.description ?? null,
        ownerUserId,
      },
      select: PrismaCategoryRepository.SELECT,
    });
    return this.toCategory(row);
  }

  async update(
    id: number,
    ownerUserId: number,
    patch: UpdateCategoryInput,
  ): Promise<Category> {
    const data: Record<string, unknown> = {};
    if (patch.title !== undefined) data.title = patch.title;
    if (patch.colorHex !== undefined) data.colorHex = patch.colorHex;
    if (patch.description !== undefined) data.description = patch.description;

    // MySQL no tiene updateManyAndFind (solo Postgres): hacemos
    // updateMany acotado al owner + findFirst para leer el estado final.
    const { count } = await this.prisma.category.updateMany({
      where: { id, ownerUserId },
      data,
    });
    if (count === 0) {
      // No existe o no es del owner. El use case ya distinguió 404 vs 403
      // en su consulta previa; esto es defensivo:
      throw new Error('Categoría no encontrada o sin autorización');
    }
    const row = await this.prisma.category.findFirst({
      where: { id, ownerUserId },
      select: PrismaCategoryRepository.SELECT,
    });
    if (!row) throw new Error('Categoría no encontrada o sin autorización');
    return this.toCategory(row);
  }

  async bookCount(categoryId: number, _ownerUserId: number): Promise<number> {
    // La categoría ya se validó como propia antes de llegar aquí; los
    // books de esa categoría pertenecen por construcción al mismo owner.
    return this.prisma.book.count({ where: { categoryId } });
  }

  async delete(id: number, ownerUserId: number): Promise<void> {
    await this.prisma.category.deleteMany({ where: { id, ownerUserId } });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Reward } from '../../domain/rewards/reward.entity';
import type {
  CreateRewardInput,
  RewardRepository,
  UpdateRewardInput,
} from '../../domain/rewards/reward.repository';

const SELECT = {
  id: true,
  bookId: true,
  createdByParentId: true,
  type: true,
  value: true,
  deadline: true,
  penaltyValue: true,
  goalId: true,
  status: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** `YYYY-MM-DD` (deadline es `@db.Date`: sin componente horario útil). */
function toDateOnlyString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Implementación Prisma del contrato `RewardRepository`.
 * Sin acotar por owner (la recompensa no tiene `ownerUserId`): la
 * propiedad se resuelve en el dominio vía `BookRepository`+`UserRepository`.
 */
@Injectable()
export class PrismaRewardRepository implements RewardRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toReward(row: {
    id: number;
    bookId: number;
    createdByParentId: number;
    type: string;
    value: unknown;
    deadline: Date;
    penaltyValue: unknown;
    goalId: number | null;
    status: string;
    resolvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Reward {
    return {
      id: row.id,
      bookId: row.bookId,
      createdByParentId: row.createdByParentId,
      type: row.type as Reward['type'],
      value: Number(row.value),
      deadline: toDateOnlyString(row.deadline),
      penaltyValue: row.penaltyValue === null ? null : Number(row.penaltyValue),
      goalId: row.goalId,
      status: row.status as Reward['status'],
      resolvedAt: row.resolvedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findById(id: number): Promise<Reward | null> {
    const row = await this.prisma.reward.findUnique({ where: { id }, select: SELECT });
    return row ? this.toReward(row) : null;
  }

  async listByBookOwner(ownerUserId: number): Promise<Reward[]> {
    const rows = await this.prisma.reward.findMany({
      where: { book: { ownerUserId } },
      select: SELECT,
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => this.toReward(r));
  }

  async listByParent(parentId: number): Promise<Reward[]> {
    const rows = await this.prisma.reward.findMany({
      where: { book: { owner: { parentId } } },
      select: SELECT,
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => this.toReward(r));
  }

  async listPendingByBook(bookId: number): Promise<Reward[]> {
    const rows = await this.prisma.reward.findMany({
      where: { bookId, status: 'PENDING' },
      select: SELECT,
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => this.toReward(r));
  }

  async listAllPending(): Promise<Reward[]> {
    const rows = await this.prisma.reward.findMany({
      where: { status: 'PENDING' },
      select: SELECT,
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => this.toReward(r));
  }

  async create(input: CreateRewardInput, bookId: number, createdByParentId: number): Promise<Reward> {
    const row = await this.prisma.reward.create({
      data: {
        type: input.type,
        value: input.value,
        deadline: new Date(input.deadline),
        penaltyValue: input.penaltyValue ?? null,
        goalId: input.goalId ?? null,
        bookId,
        createdByParentId,
      },
      select: SELECT,
    });
    return this.toReward(row);
  }

  async update(id: number, patch: UpdateRewardInput): Promise<Reward> {
    const data: Record<string, unknown> = {};
    if (patch.type !== undefined) data.type = patch.type;
    if (patch.value !== undefined) data.value = patch.value;
    if (patch.deadline !== undefined) data.deadline = new Date(patch.deadline);
    if (patch.penaltyValue !== undefined) data.penaltyValue = patch.penaltyValue;
    if (patch.goalId !== undefined) data.goalId = patch.goalId;

    const row = await this.prisma.reward.update({ where: { id }, data, select: SELECT });
    return this.toReward(row);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.reward.delete({ where: { id } });
  }

  async resolve(id: number, status: 'FULFILLED' | 'PENALIZED', resolvedAt: Date): Promise<Reward> {
    const row = await this.prisma.reward.update({
      where: { id },
      data: { status, resolvedAt },
      select: SELECT,
    });
    return this.toReward(row);
  }
}

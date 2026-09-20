import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Goal } from '../../domain/goals/goal.entity';
import type {
  CreateGoalInput,
  GoalRepository,
  UpdateGoalInput,
} from '../../domain/goals/goal.repository';

const SELECT = {
  id: true,
  childId: true,
  createdByParentId: true,
  name: true,
  description: true,
  targetPoints: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Implementación Prisma del contrato `GoalRepository`.
 * No acota por owner (la meta no tiene `ownerUserId`): la comprobación
 * "¿es mi hijo?" la hace el use case vía `UserRepository`.
 */
@Injectable()
export class PrismaGoalRepository implements GoalRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toGoal(row: {
    id: number;
    childId: number;
    createdByParentId: number;
    name: string;
    description: string | null;
    targetPoints: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): Goal {
    return { ...row, status: row.status as Goal['status'] };
  }

  async findById(id: number): Promise<Goal | null> {
    const row = await this.prisma.goal.findUnique({ where: { id }, select: SELECT });
    return row ? this.toGoal(row) : null;
  }

  async listByChild(childId: number): Promise<Goal[]> {
    const rows = await this.prisma.goal.findMany({
      where: { childId },
      select: SELECT,
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => this.toGoal(r));
  }

  async create(input: CreateGoalInput, childId: number, createdByParentId: number): Promise<Goal> {
    const row = await this.prisma.goal.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        targetPoints: input.targetPoints,
        status: 'ACTIVE',
        childId,
        createdByParentId,
      },
      select: SELECT,
    });
    return this.toGoal(row);
  }

  async update(id: number, patch: UpdateGoalInput): Promise<Goal> {
    const data: Record<string, unknown> = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.targetPoints !== undefined) data.targetPoints = patch.targetPoints;

    const row = await this.prisma.goal.update({ where: { id }, data, select: SELECT });
    return this.toGoal(row);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.goal.delete({ where: { id } });
  }

  async setStatus(id: number, status: Goal['status']): Promise<Goal> {
    const row = await this.prisma.goal.update({ where: { id }, data: { status }, select: SELECT });
    return this.toGoal(row);
  }
}

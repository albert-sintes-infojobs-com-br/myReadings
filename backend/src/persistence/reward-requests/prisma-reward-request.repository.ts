import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { RewardRequest, RewardRequestStatus } from '../../domain/reward-requests/reward-request.entity';
import type { RewardRequestRepository } from '../../domain/reward-requests/reward-request.repository';

const SELECT = {
  id: true,
  bookId: true,
  childId: true,
  status: true,
  createdAt: true,
  resolvedAt: true,
} as const;

/** Implementación Prisma del contrato `RewardRequestRepository`. */
@Injectable()
export class PrismaRewardRequestRepository implements RewardRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toRequest(row: {
    id: number;
    bookId: number;
    childId: number;
    status: string;
    createdAt: Date;
    resolvedAt: Date | null;
  }): RewardRequest {
    return { ...row, status: row.status as RewardRequestStatus };
  }

  async findById(id: number): Promise<RewardRequest | null> {
    const row = await this.prisma.rewardRequest.findUnique({ where: { id }, select: SELECT });
    return row ? this.toRequest(row) : null;
  }

  async listPendingByParent(parentId: number): Promise<RewardRequest[]> {
    const rows = await this.prisma.rewardRequest.findMany({
      where: { status: 'PENDING', child: { parentId } },
      select: SELECT,
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => this.toRequest(r));
  }

  async listByChild(childId: number): Promise<RewardRequest[]> {
    const rows = await this.prisma.rewardRequest.findMany({
      where: { childId },
      select: SELECT,
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => this.toRequest(r));
  }

  async create(bookId: number, childId: number): Promise<RewardRequest> {
    const row = await this.prisma.rewardRequest.create({
      data: { bookId, childId, status: 'PENDING' },
      select: SELECT,
    });
    return this.toRequest(row);
  }

  async resolve(
    id: number,
    status: 'RESOLVED' | 'DISMISSED',
    resolvedAt: Date,
  ): Promise<RewardRequest> {
    const row = await this.prisma.rewardRequest.update({
      where: { id },
      data: { status, resolvedAt },
      select: SELECT,
    });
    return this.toRequest(row);
  }
}

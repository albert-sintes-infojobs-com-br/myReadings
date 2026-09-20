import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { LedgerEntry, LedgerKind } from '../../domain/ledger/ledger-entry.entity';
import type {
  CreateLedgerEntryInput,
  LedgerRepository,
} from '../../domain/ledger/ledger.repository';

const SELECT = {
  id: true,
  childId: true,
  rewardId: true,
  kind: true,
  amount: true,
  goalId: true,
  reason: true,
  createdAt: true,
} as const;

/** Implementación Prisma del contrato `LedgerRepository`. */
@Injectable()
export class PrismaLedgerRepository implements LedgerRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntry(row: {
    id: number;
    childId: number;
    rewardId: number | null;
    kind: string;
    amount: unknown;
    goalId: number | null;
    reason: string;
    createdAt: Date;
  }): LedgerEntry {
    return {
      id: row.id,
      childId: row.childId,
      rewardId: row.rewardId,
      kind: row.kind as LedgerEntry['kind'],
      amount: Number(row.amount),
      goalId: row.goalId,
      reason: row.reason as LedgerEntry['reason'],
      createdAt: row.createdAt,
    };
  }

  async create(input: CreateLedgerEntryInput): Promise<LedgerEntry> {
    const row = await this.prisma.ledgerEntry.create({
      data: {
        childId: input.childId,
        rewardId: input.rewardId ?? null,
        kind: input.kind,
        amount: input.amount,
        goalId: input.goalId ?? null,
        reason: input.reason,
      },
      select: SELECT,
    });
    return this.toEntry(row);
  }

  async sumByChild(childId: number, kind: LedgerKind): Promise<number> {
    const result = await this.prisma.ledgerEntry.aggregate({
      where: { childId, kind },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  async sumByGoal(goalId: number): Promise<number> {
    const result = await this.prisma.ledgerEntry.aggregate({
      where: { goalId },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  async listByChild(childId: number): Promise<LedgerEntry[]> {
    const rows = await this.prisma.ledgerEntry.findMany({
      where: { childId },
      select: SELECT,
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => this.toEntry(r));
  }
}

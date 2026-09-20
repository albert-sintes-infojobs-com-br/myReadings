import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  BooksByStatusCount,
  FinishedBooksByPeriodEntry,
  RewardsByStatusCount,
} from '../../domain/stats/stats.entity';
import type { StatsRepository } from '../../domain/stats/stats.repository';

/**
 * Implementación Prisma de las agregaciones de Estadísticas (Fase 10).
 *
 * `booksByStatus`/`rewardsByStatus` usan `groupBy` (agregación en BD).
 * `finishedBooksByPeriod`/`avgReadingDays` se calculan en memoria sobre
 * un `findMany` acotado: Prisma no soporta `YEAR()`/`MONTH()`/`DATEDIFF()`
 * de forma portable en `groupBy`/`aggregate` sin `$queryRaw`, y el
 * volumen de libros por hijo en este dominio es pequeño (decenas).
 */
@Injectable()
export class PrismaStatsRepository implements StatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async booksByStatus(ownerUserId: number): Promise<BooksByStatusCount> {
    const rows = await this.prisma.book.groupBy({
      by: ['status'],
      where: { ownerUserId },
      _count: { _all: true },
    });
    const result: BooksByStatusCount = { NOT_STARTED: 0, READING: 0, FINISHED: 0 };
    for (const row of rows) {
      result[row.status as keyof BooksByStatusCount] = row._count._all;
    }
    return result;
  }

  async finishedBooksByPeriod(ownerUserId: number): Promise<FinishedBooksByPeriodEntry[]> {
    const rows = await this.prisma.book.findMany({
      where: { ownerUserId, status: 'FINISHED', endDate: { not: null } },
      select: { endDate: true },
    });
    const byPeriod = new Map<string, FinishedBooksByPeriodEntry>();
    for (const row of rows) {
      const endDate = row.endDate as Date;
      const year = endDate.getUTCFullYear();
      const month = endDate.getUTCMonth() + 1;
      const key = `${year}-${month}`;
      const existing = byPeriod.get(key);
      if (existing) existing.count += 1;
      else byPeriod.set(key, { year, month, count: 1 });
    }
    return Array.from(byPeriod.values()).sort((a, b) => a.year - b.year || a.month - b.month);
  }

  async rewardsByStatus(ownerUserId: number): Promise<RewardsByStatusCount> {
    const rows = await this.prisma.reward.groupBy({
      by: ['status'],
      where: { book: { ownerUserId } },
      _count: { _all: true },
    });
    const result: RewardsByStatusCount = { PENDING: 0, FULFILLED: 0, PENALIZED: 0 };
    for (const row of rows) {
      result[row.status as keyof RewardsByStatusCount] = row._count._all;
    }
    return result;
  }

  async avgReadingDays(ownerUserId: number): Promise<number | null> {
    const rows = await this.prisma.book.findMany({
      where: { ownerUserId, status: 'FINISHED', startDate: { not: null }, endDate: { not: null } },
      select: { startDate: true, endDate: true },
    });
    if (rows.length === 0) return null;
    const totalDays = rows.reduce((sum, row) => {
      const start = row.startDate as Date;
      const end = row.endDate as Date;
      return sum + Math.round((end.getTime() - start.getTime()) / 86_400_000);
    }, 0);
    return Math.round((totalDays / rows.length) * 10) / 10;
  }
}

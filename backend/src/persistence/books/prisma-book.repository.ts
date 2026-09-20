import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Book } from '../../domain/books/book.entity';
import type {
  BookFilter,
  BookRepository,
  CreateBookInput,
  UpdateBookInput,
} from '../../domain/books/book.repository';

type BookRow = {
  id: number;
  ownerUserId: number;
  title: string;
  author: string;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  notes: string | null;
  rating: number | null;
  categoryId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

const SELECT = {
  id: true,
  ownerUserId: true,
  title: true,
  author: true,
  status: true,
  startDate: true,
  endDate: true,
  notes: true,
  rating: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** `YYYY-MM-DD` (los campos son `@db.Date`: sin componente horario útil). */
function toDateOnlyString(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

/**
 * Implementación Prisma del contrato `BookRepository`.
 * Cada query acota por `ownerUserId`: un libro es siempre privado.
 */
@Injectable()
export class PrismaBookRepository implements BookRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toBook(row: BookRow): Book {
    return {
      id: row.id,
      ownerUserId: row.ownerUserId,
      title: row.title,
      author: row.author,
      status: row.status as Book['status'],
      startDate: toDateOnlyString(row.startDate),
      endDate: toDateOnlyString(row.endDate),
      notes: row.notes,
      rating: row.rating,
      categoryId: row.categoryId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findById(id: number, ownerUserId: number): Promise<Book | null> {
    const row = await this.prisma.book.findFirst({
      where: { id, ownerUserId },
      select: SELECT,
    });
    return row ? this.toBook(row) : null;
  }

  async findByIdAny(id: number): Promise<Book | null> {
    const row = await this.prisma.book.findUnique({ where: { id }, select: SELECT });
    return row ? this.toBook(row) : null;
  }

  async listByOwner(ownerUserId: number, filter?: BookFilter): Promise<Book[]> {
    const rows = await this.prisma.book.findMany({
      where: {
        ownerUserId,
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.categoryId !== undefined ? { categoryId: filter.categoryId } : {}),
      },
      select: SELECT,
      orderBy: { id: 'asc' },
    });
    return rows.map((r) => this.toBook(r));
  }

  async create(input: CreateBookInput, ownerUserId: number): Promise<Book> {
    const row = await this.prisma.book.create({
      data: {
        title: input.title,
        author: input.author,
        status: input.status ?? 'NOT_STARTED',
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        notes: input.notes ?? null,
        rating: input.rating ?? null,
        categoryId: input.categoryId ?? null,
        ownerUserId,
      },
      select: SELECT,
    });
    return this.toBook(row);
  }

  async update(id: number, ownerUserId: number, patch: UpdateBookInput): Promise<Book> {
    const data: Record<string, unknown> = {};
    if (patch.title !== undefined) data.title = patch.title;
    if (patch.author !== undefined) data.author = patch.author;
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.startDate !== undefined) {
      data.startDate = patch.startDate ? new Date(patch.startDate) : null;
    }
    if (patch.endDate !== undefined) {
      data.endDate = patch.endDate ? new Date(patch.endDate) : null;
    }
    if (patch.notes !== undefined) data.notes = patch.notes;
    if (patch.rating !== undefined) data.rating = patch.rating;
    if (patch.categoryId !== undefined) data.categoryId = patch.categoryId;

    // MySQL no tiene updateManyAndFind (solo Postgres): updateMany acotado
    // por owner + findFirst para leer el estado final.
    const { count } = await this.prisma.book.updateMany({
      where: { id, ownerUserId },
      data,
    });
    if (count === 0) {
      throw new Error('Libro no encontrado o sin autorización');
    }
    const row = await this.prisma.book.findFirst({ where: { id, ownerUserId }, select: SELECT });
    if (!row) throw new Error('Libro no encontrado o sin autorización');
    return this.toBook(row);
  }

  async delete(id: number, ownerUserId: number): Promise<void> {
    await this.prisma.book.deleteMany({ where: { id, ownerUserId } });
  }

  async categoryBelongsToOwner(categoryId: number, ownerUserId: number): Promise<boolean> {
    const row = await this.prisma.category.findFirst({
      where: { id: categoryId, ownerUserId },
      select: { id: true },
    });
    return row !== null;
  }
}

import { describe, expect, it, vi } from 'vitest';
import { PrismaBookRepository } from '../persistence/books/prisma-book.repository';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Tests de persistencia (Prisma) de Libros (Fase 5). Prisma se mockea a
 * mano: la clave es el acotamiento por `ownerUserId` y la conversión de
 * fechas Date ↔ string `YYYY-MM-DD`.
 */

describe('PrismaBookRepository', () => {
  const baseRow = {
    id: 10,
    ownerUserId: 5,
    title: 'Dune',
    author: 'Frank Herbert',
    status: 'NOT_STARTED',
    startDate: new Date('2026-01-15T00:00:00.000Z'),
    endDate: null,
    notes: null,
    rating: null,
    categoryId: null,
    createdAt: new Date('2026-09-01T10:00:00Z'),
    updatedAt: new Date('2026-09-01T10:00:00Z'),
  };

  function prismaMock() {
    return {
      book: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      category: {
        findFirst: vi.fn(),
      },
    };
  }

  let prisma: ReturnType<typeof prismaMock>;
  let repo: PrismaBookRepository;

  function setup() {
    prisma = prismaMock();
    repo = new PrismaBookRepository(prisma as unknown as PrismaService);
  }

  it('findById acota por owner y convierte startDate a YYYY-MM-DD', async () => {
    setup();
    prisma.book.findFirst.mockResolvedValue(baseRow);
    const book = await repo.findById(10, 5);
    expect(prisma.book.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10, ownerUserId: 5 } }),
    );
    expect(book?.startDate).toBe('2026-01-15');
    expect(book?.endDate).toBeNull();
  });

  it('listByOwner aplica filtros status y categoryId', async () => {
    setup();
    prisma.book.findMany.mockResolvedValue([baseRow]);
    await repo.listByOwner(5, { status: 'READING', categoryId: 3 });
    expect(prisma.book.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerUserId: 5, status: 'READING', categoryId: 3 } }),
    );
  });

  it('create persiste con ownerUserId y convierte fechas a Date', async () => {
    setup();
    prisma.book.create.mockResolvedValue(baseRow);
    await repo.create({ title: 'Dune', author: 'Frank Herbert', startDate: '2026-01-15' }, 5);
    const data = prisma.book.create.mock.calls[0][0].data;
    expect(data.ownerUserId).toBe(5);
    expect(data.startDate).toBeInstanceOf(Date);
  });

  it('update acota por owner; count=0 lanza Error', async () => {
    setup();
    prisma.book.updateMany.mockResolvedValue({ count: 0 });
    await expect(repo.update(10, 5, { title: 'X' })).rejects.toThrow();
  });

  it('delete usa deleteMany acotado por owner', async () => {
    setup();
    prisma.book.deleteMany.mockResolvedValue({ count: 1 });
    await repo.delete(10, 5);
    expect(prisma.book.deleteMany).toHaveBeenCalledWith({ where: { id: 10, ownerUserId: 5 } });
  });

  it('categoryBelongsToOwner consulta category acotada por owner', async () => {
    setup();
    prisma.category.findFirst.mockResolvedValue({ id: 3 });
    const ok = await repo.categoryBelongsToOwner(3, 5);
    expect(ok).toBe(true);
    expect(prisma.category.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 3, ownerUserId: 5 } }),
    );
  });
});

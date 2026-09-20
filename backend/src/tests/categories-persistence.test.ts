import { describe, expect, it, vi } from 'vitest';
import { PrismaCategoryRepository } from '../persistence/categories/prisma-category.repository';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Tests de persistencia (Prisma) de Categorías (Fase 4).
 * Prisma se mockea a mano (sin createTestingModule): la clave que se
 * verifica aquí es el ACOTAMIENTO por ownerUserId en cada query.
 */

describe('PrismaCategoryRepository', () => {
  const baseRow = {
    id: 101,
    ownerUserId: 5,
    title: 'Ciencia ficción',
    description: null,
    colorHex: '#1E88E5',
    createdAt: new Date('2026-09-01T10:00:00Z'),
  };

  function prismaMock() {
    return {
      category: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      book: {
        count: vi.fn(),
      },
    };
  }

  let prisma: ReturnType<typeof prismaMock>;
  let repo: PrismaCategoryRepository;

  function setup() {
    prisma = prismaMock();
    repo = new PrismaCategoryRepository(prisma as unknown as PrismaService);
  }

  it('findById acota por owner (no devuelve la misma id de otro prop)', async () => {
    setup();
    prisma.category.findFirst.mockResolvedValue(baseRow);

    await repo.findById(101, 5);

    expect(prisma.category.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 101, ownerUserId: 5 } }),
    );
  });

  it('listByOwner sin parent: una query solo del owner', async () => {
    setup();
    prisma.category.findMany.mockResolvedValue([baseRow]);

    const list = await repo.listByOwner(5);

    expect(prisma.category.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerUserId: 5 } }),
    );
    expect(list).toEqual([baseRow]);
  });

  it('listByOwner con parent: propias primero, luego las del padre', async () => {
    setup();
    const ownRow = { ...baseRow, ownerUserId: 9, id: 201 };
    prisma.category.findMany
      .mockResolvedValueOnce([ownRow])
      .mockResolvedValueOnce([baseRow]);

    const list = await repo.listByOwner(9, 5);

    expect(list.map((c) => c.id)).toEqual([201, 101]);
    expect(prisma.category.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { ownerUserId: 9 } }),
    );
  });

  it('create persiste con el ownerUserId del input', async () => {
    setup();
    prisma.category.create.mockResolvedValue(baseRow);

    const cat = await repo.create(
      { title: 'Ciencia ficción', colorHex: '#1E88E5', description: 'SF' },
      5,
    );

    expect(prisma.category.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Ciencia ficción',
          colorHex: '#1E88E5',
          description: 'SF',
          ownerUserId: 5,
        }),
      }),
    );
    expect(cat.id).toBe(101);
  });

  it('update acota por owner; count=0 lanza Error', async () => {
    setup();
    prisma.category.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(repo.update(101, 5, { title: 'X' })).rejects.toThrow();
  });

  it('bookCount consulta por categoryId', async () => {
    setup();
    prisma.book.count.mockResolvedValue(3);

    const n = await repo.bookCount(101, 5);
    expect(n).toBe(3);
    expect(prisma.book.count).toHaveBeenCalledWith({ where: { categoryId: 101 } });
  });

  it('delete usa deleteMany acotado por owner', async () => {
    setup();
    prisma.category.deleteMany.mockResolvedValue({ count: 1 });

    await repo.delete(101, 5);
    expect(prisma.category.deleteMany).toHaveBeenCalledWith({
      where: { id: 101, ownerUserId: 5 },
    });
  });
});

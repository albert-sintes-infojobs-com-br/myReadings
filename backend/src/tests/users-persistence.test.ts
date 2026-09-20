import { describe, expect, it, vi } from 'vitest';
import { PrismaUserRepository } from '../persistence/users/prisma-user.repository';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Tests de persistencia (Prisma) de Users (Fase 5). Prisma se mockea a
 * mano; la clave que se verifica es el SELECT correcto (con/sin hash) y
 * el acotamiento en `listChildren`.
 */

describe('PrismaUserRepository', () => {
  function prismaMock() {
    return {
      user: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
    };
  }

  let prisma: ReturnType<typeof prismaMock>;
  let repo: PrismaUserRepository;

  function setup() {
    prisma = prismaMock();
    repo = new PrismaUserRepository(prisma as unknown as PrismaService);
  }

  it('findByEmail selecciona passwordHash (necesario para login)', async () => {
    setup();
    prisma.user.findUnique.mockResolvedValue({
      id: 1, name: 'Ana', email: 'ana@test.com', role: 'PARENT', parentId: null, passwordHash: 'x:y',
    });
    const user = await repo.findByEmail('ana@test.com');
    const call = prisma.user.findUnique.mock.calls[0][0];
    expect(call.select).toEqual(expect.objectContaining({ passwordHash: true }));
    expect(user?.passwordHash).toBe('x:y');
  });

  it('findById NO selecciona passwordHash (proyección segura)', async () => {
    setup();
    prisma.user.findUnique.mockResolvedValue({ id: 1, name: 'Ana', email: 'ana@test.com', role: 'PARENT', parentId: null });
    await repo.findById(1);
    const call = prisma.user.findUnique.mock.calls[0][0];
    expect(call.select).not.toHaveProperty('passwordHash');
  });

  it('listChildren acota por parentId', async () => {
    setup();
    prisma.user.findMany.mockResolvedValue([]);
    await repo.listChildren(5);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentId: 5 } }),
    );
  });

  it('createParent fuerza role PARENT y parentId null', async () => {
    setup();
    prisma.user.create.mockResolvedValue({ id: 1, name: 'Ana', email: 'ana@test.com', role: 'PARENT', parentId: null });
    await repo.createParent({ name: 'Ana', email: 'ana@test.com', passwordHash: 'x:y' });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'PARENT', parentId: null }) }),
    );
  });

  it('createChild fuerza role CHILD y el parentId dado', async () => {
    setup();
    prisma.user.create.mockResolvedValue({ id: 2, name: 'Lola', email: 'lola@test.com', role: 'CHILD', parentId: 5 });
    await repo.createChild({ name: 'Lola', email: 'lola@test.com', passwordHash: 'x:y', parentId: 5 });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'CHILD', parentId: 5 }) }),
    );
  });
});

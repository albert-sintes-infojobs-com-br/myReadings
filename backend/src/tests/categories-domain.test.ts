import { describe, expect, it, vi } from 'vitest';
import {
  CreateCategoryUseCase,
  DeleteCategoryUseCase,
  GetCategoryUseCase,
  ListCategoriesUseCase,
  UpdateCategoryUseCase,
} from '../domain/categories/use-cases';
import {
  ConflictError,
  DomainNotFound,
  DomainValidation,
  OwnershipError,
} from '../domain/shared/domain-errors';
import type {
  CategoryRepository,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '../domain/categories/category.repository';
import type { Category } from '../domain/categories/category.entity';
import type { ActorView } from '../domain/shared/actor';

/**
 * Tests de dominio de Categorías (Fase 4).
 * TDD: se escribieron ANTES de la implementación de los use cases.
 * Sin NestJS ni Prisma: solo interfaces del dominio + mocks manuales.
 */

const PARENT: ActorView = { id: 5, role: 'PARENT', parentId: null };
const CHILD: ActorView = { id: 9, role: 'CHILD', parentId: 5 };

function makeCategory(over: Partial<Category> = {}): Category {
  return {
    id: 101,
    ownerUserId: 5,
    title: 'Ciencia ficción',
    description: null,
    colorHex: '#1e88e5',
    createdAt: new Date('2026-09-01T10:00:00Z'),
    ...over,
  };
}

/** Mock de CategoryRepository: implementa la interface con vi.fn(). */
function repoMock() {
  return {
    findById: vi.fn(),
    listByOwner: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    bookCount: vi.fn(),
    delete: vi.fn(),
  };
}

describe('CreateCategoryUseCase', () => {
  it('crea la categoría ligada al actor propietario', async () => {
    const repo = repoMock();
    const uc = new CreateCategoryUseCase(repo as unknown as CategoryRepository);
    repo.create.mockResolvedValue(makeCategory());

    const result = await uc.execute(PARENT, {
      title: 'Ciencia ficción',
      colorHex: '#1E88E5',
      description: 'Novela SF',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Ciencia ficción', colorHex: '#1E88E5' }),
      5, // ownerUserId = actor.id
    );
    expect(result.ownerUserId).toBe(5);
    expect(result.title).toBe('Ciencia ficción');
  });

  it.each(['nope', '#123', '#GGGGGG', '1E88E5', '#12345', '#1234567'])(
    'rechaza colorHex inválido: %s (sin tocar el repo)',
    async (colorHex) => {
      const repo = repoMock();
      const uc = new CreateCategoryUseCase(repo as unknown as CategoryRepository);

      await expect(
        uc.execute(CHILD, { title: 'X', colorHex }),
      ).rejects.toThrow(DomainValidation);
      expect(repo.create).not.toHaveBeenCalled();
    },
  );

  it('acepta colorHex #ABCDEF en minúsculas o mayúsculas', async () => {
    const repo = repoMock();
    const uc = new CreateCategoryUseCase(repo as unknown as CategoryRepository);
    repo.create.mockResolvedValue(makeCategory());
    await expect(
      uc.execute(CHILD, { title: 'X', colorHex: '#abcdef' }),
    ).resolves.not.toThrow();
    await expect(
      uc.execute(CHILD, { title: 'X', colorHex: '#ABCDEF' }),
    ).resolves.not.toThrow();
  });

  it('título vacío → DomainValidation sin tocar el repo', async () => {
    const repo = repoMock();
    const uc = new CreateCategoryUseCase(repo as unknown as CategoryRepository);
    await expect(
      uc.execute(PARENT, { title: '   ', colorHex: '#111111' }),
    ).rejects.toThrow(DomainValidation);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('ListCategoriesUseCase', () => {
  it('el padre ve solo las suyas', async () => {
    const repo = repoMock();
    const uc = new ListCategoriesUseCase(repo as unknown as CategoryRepository);
    repo.listByOwner.mockResolvedValue([makeCategory({ id: 1 })]);

    const list = await uc.execute(PARENT);

    expect(repo.listByOwner).toHaveBeenCalledWith(5, undefined);
    expect(list).toHaveLength(1);
  });

  it('el hijo ve las suyas + las de su padre (solo lectura implícita)', async () => {
    const repo = repoMock();
    const uc = new ListCategoriesUseCase(repo as unknown as CategoryRepository);
    const own = makeCategory({ id: 2, ownerUserId: 9, title: 'Dibujos míos' });
    const fromParent = makeCategory({ id: 1, ownerUserId: 5 });
    repo.listByOwner.mockResolvedValue([own, fromParent]);

    const list = await uc.execute(CHILD);

    expect(repo.listByOwner).toHaveBeenCalledWith(9, 5);
    expect(list.map((c) => c.id)).toEqual([2, 1]);
    // Cada categoría expone su ownerUserId para que el cliente distinga
    // qué puede editar.
    expect(list.find((c) => c.id === 1)!.ownerUserId).toBe(5);
  });
});

describe('GetCategoryUseCase', () => {
  it('devuelve la categoría propia', async () => {
    const repo = repoMock();
    const uc = new GetCategoryUseCase(repo as unknown as CategoryRepository);
    repo.findById.mockResolvedValue(makeCategory());

    const cat = await uc.execute(PARENT, 101);
    expect(cat.id).toBe(101);
  });

  it('categoría inexistente → DomainNotFound (y no OwnershipError)', async () => {
    const repo = repoMock();
    const uc = new GetCategoryUseCase(repo as unknown as CategoryRepository);
    repo.findById.mockResolvedValue(null);

    await expect(uc.execute(PARENT, 999)).rejects.toThrow(DomainNotFound);
  });
});

describe('UpdateCategoryUseCase', () => {
  it('actualiza un campo y persiste el patch completo dado', async () => {
    const repo = repoMock();
    const uc = new UpdateCategoryUseCase(repo as unknown as CategoryRepository);
    repo.findById.mockResolvedValue(makeCategory());
    repo.update.mockResolvedValue(makeCategory({ title: 'Ciencia' }));

    const result = await uc.execute(PARENT, 101, { title: 'Ciencia' });

    expect(repo.update).toHaveBeenCalledWith(101, 5, { title: 'Ciencia' });
    expect(result.title).toBe('Ciencia');
  });

  it('el hijo NO puede editar categorías de su padre (OwnershipError)', async () => {
    const repo = repoMock();
    const uc = new UpdateCategoryUseCase(repo as unknown as CategoryRepository);
    // La categoría del padre (ownerUserId=5) se intenta editar por hijo (id=9).
    repo.findById.mockResolvedValue(makeCategory({ ownerUserId: 5 }));

    await expect(
      uc.execute(CHILD, 101, { title: 'hack' }),
    ).rejects.toThrow(OwnershipError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('nulo para patch → DomainValidation', async () => {
    const repo = repoMock();
    const uc = new UpdateCategoryUseCase(repo as unknown as CategoryRepository);
    await expect(
      uc.execute(PARENT, 101, undefined as unknown as UpdateCategoryInput),
    ).rejects.toThrow(DomainValidation);
  });
});

describe('DeleteCategoryUseCase', () => {
  it('borra una categoría propia sin libros', async () => {
    const repo = repoMock();
    const uc = new DeleteCategoryUseCase(repo as unknown as CategoryRepository);
    repo.findById.mockResolvedValue(makeCategory());
    repo.bookCount.mockResolvedValue(0);

    await uc.execute(PARENT, 101);

    expect(repo.bookCount).toHaveBeenCalledWith(101, 5);
    expect(repo.delete).toHaveBeenCalledWith(101, 5);
  });

  it('categoría con libros → ConflictError (sin borrar)', async () => {
    const repo = repoMock();
    const uc = new DeleteCategoryUseCase(repo as unknown as CategoryRepository);
    repo.findById.mockResolvedValue(makeCategory());
    repo.bookCount.mockResolvedValue(3);

    await expect(uc.execute(PARENT, 101)).rejects.toThrow(ConflictError);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('el hijo no puede borrar la categoría del padre', async () => {
    const repo = repoMock();
    const uc = new DeleteCategoryUseCase(repo as unknown as CategoryRepository);
    repo.findById.mockResolvedValue(makeCategory({ ownerUserId: 5 }));

    await expect(uc.execute(CHILD, 101)).rejects.toThrow(OwnershipError);
    expect(repo.delete).not.toHaveBeenCalled();
  });
});

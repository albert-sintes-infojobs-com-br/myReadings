import { describe, expect, it, vi } from 'vitest';
import {
  CreateBookUseCase,
  DeleteBookUseCase,
  GetBookUseCase,
  ListBooksUseCase,
  UpdateBookUseCase,
} from '../domain/books/use-cases';
import { DomainNotFound, DomainValidation, OwnershipError } from '../domain/shared/domain-errors';
import type { BookRepository } from '../domain/books/book.repository';
import type { Book } from '../domain/books/book.entity';
import type { ActorView } from '../domain/shared/actor';

/**
 * Tests de dominio de Libros (Fase 5). TDD: escritos junto con la
 * implementación de los use cases. Sin NestJS ni Prisma.
 */

const PARENT: ActorView = { id: 5, role: 'PARENT', parentId: null };
const OTHER: ActorView = { id: 99, role: 'PARENT', parentId: null };

function makeBook(over: Partial<Book> = {}): Book {
  return {
    id: 10,
    ownerUserId: 5,
    title: 'Dune',
    author: 'Frank Herbert',
    status: 'NOT_STARTED',
    startDate: null,
    endDate: null,
    notes: null,
    rating: null,
    categoryId: null,
    createdAt: new Date('2026-09-01T10:00:00Z'),
    updatedAt: new Date('2026-09-01T10:00:00Z'),
    ...over,
  };
}

function repoMock() {
  return {
    findById: vi.fn(),
    listByOwner: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    categoryBelongsToOwner: vi.fn(),
  };
}

describe('CreateBookUseCase', () => {
  it('crea el libro ligado al actor propietario (status por defecto NOT_STARTED)', async () => {
    const repo = repoMock();
    const uc = new CreateBookUseCase(repo as unknown as BookRepository);
    repo.create.mockResolvedValue(makeBook());

    await uc.execute(PARENT, { title: 'Dune', author: 'Frank Herbert' });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Dune', author: 'Frank Herbert', status: 'NOT_STARTED' }),
      5,
    );
  });

  it('rechaza sin title/author', async () => {
    const repo = repoMock();
    const uc = new CreateBookUseCase(repo as unknown as BookRepository);
    await expect(uc.execute(PARENT, { title: '', author: 'X' } as never)).rejects.toThrow(DomainValidation);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it.each([-1, 6, 1.5])('rechaza rating fuera de 0-5: %s', async (rating) => {
    const repo = repoMock();
    const uc = new CreateBookUseCase(repo as unknown as BookRepository);
    await expect(
      uc.execute(PARENT, { title: 'X', author: 'Y', rating }),
    ).rejects.toThrow(DomainValidation);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rechaza endDate anterior a startDate', async () => {
    const repo = repoMock();
    const uc = new CreateBookUseCase(repo as unknown as BookRepository);
    await expect(
      uc.execute(PARENT, { title: 'X', author: 'Y', startDate: '2026-02-01', endDate: '2026-01-01' }),
    ).rejects.toThrow(DomainValidation);
  });

  it('rechaza categoryId que no pertenece al actor', async () => {
    const repo = repoMock();
    const uc = new CreateBookUseCase(repo as unknown as BookRepository);
    repo.categoryBelongsToOwner.mockResolvedValue(false);
    await expect(
      uc.execute(PARENT, { title: 'X', author: 'Y', categoryId: 77 }),
    ).rejects.toThrow(DomainValidation);
    expect(repo.create).not.toHaveBeenCalled();
  });
});

describe('ListBooksUseCase', () => {
  it('delega en el repo con el ownerUserId del actor y el filtro', async () => {
    const repo = repoMock();
    const uc = new ListBooksUseCase(repo as unknown as BookRepository);
    repo.listByOwner.mockResolvedValue([makeBook()]);
    const list = await uc.execute(PARENT, { status: 'READING' });
    expect(repo.listByOwner).toHaveBeenCalledWith(5, { status: 'READING' });
    expect(list).toHaveLength(1);
  });
});

describe('GetBookUseCase', () => {
  it('devuelve el libro propio', async () => {
    const repo = repoMock();
    const uc = new GetBookUseCase(repo as unknown as BookRepository);
    repo.findById.mockResolvedValue(makeBook());
    const book = await uc.execute(PARENT, 10);
    expect(book.id).toBe(10);
  });

  it('libro inexistente (o ajeno) → DomainNotFound', async () => {
    const repo = repoMock();
    const uc = new GetBookUseCase(repo as unknown as BookRepository);
    repo.findById.mockResolvedValue(null);
    await expect(uc.execute(PARENT, 999)).rejects.toThrow(DomainNotFound);
  });
});

describe('UpdateBookUseCase', () => {
  it('actualiza campos simples', async () => {
    const repo = repoMock();
    const uc = new UpdateBookUseCase(repo as unknown as BookRepository);
    repo.findById.mockResolvedValue(makeBook());
    repo.update.mockResolvedValue(makeBook({ notes: 'genial' }));

    const result = await uc.execute(PARENT, 10, { notes: 'genial' });
    expect(repo.update).toHaveBeenCalledWith(10, 5, { notes: 'genial' });
    expect(result.notes).toBe('genial');
  });

  it('otro usuario no puede editar el libro (OwnershipError)', async () => {
    const repo = repoMock();
    const uc = new UpdateBookUseCase(repo as unknown as BookRepository);
    repo.findById.mockResolvedValue(makeBook({ ownerUserId: 5 }));
    await expect(uc.execute(OTHER, 10, { notes: 'x' })).rejects.toThrow(OwnershipError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('permite NOT_STARTED → READING', async () => {
    const repo = repoMock();
    const uc = new UpdateBookUseCase(repo as unknown as BookRepository);
    repo.findById.mockResolvedValue(makeBook({ status: 'NOT_STARTED' }));
    repo.update.mockResolvedValue(makeBook({ status: 'READING' }));
    await uc.execute(PARENT, 10, { status: 'READING' });
    expect(repo.update).toHaveBeenCalledWith(10, 5, { status: 'READING' });
  });

  it('permite READING → FINISHED', async () => {
    const repo = repoMock();
    const uc = new UpdateBookUseCase(repo as unknown as BookRepository);
    repo.findById.mockResolvedValue(makeBook({ status: 'READING' }));
    repo.update.mockResolvedValue(makeBook({ status: 'FINISHED' }));
    await uc.execute(PARENT, 10, { status: 'FINISHED' });
    expect(repo.update).toHaveBeenCalledWith(10, 5, { status: 'FINISHED' });
  });

  it('rechaza READING → NOT_STARTED (retroceso)', async () => {
    const repo = repoMock();
    const uc = new UpdateBookUseCase(repo as unknown as BookRepository);
    repo.findById.mockResolvedValue(makeBook({ status: 'READING' }));
    await expect(uc.execute(PARENT, 10, { status: 'NOT_STARTED' })).rejects.toThrow(DomainValidation);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rechaza salir de FINISHED (terminal)', async () => {
    const repo = repoMock();
    const uc = new UpdateBookUseCase(repo as unknown as BookRepository);
    repo.findById.mockResolvedValue(makeBook({ status: 'FINISHED' }));
    await expect(uc.execute(PARENT, 10, { status: 'READING' })).rejects.toThrow(DomainValidation);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('rechaza endDate anterior al startDate ya guardado', async () => {
    const repo = repoMock();
    const uc = new UpdateBookUseCase(repo as unknown as BookRepository);
    repo.findById.mockResolvedValue(makeBook({ startDate: '2026-02-01' }));
    await expect(uc.execute(PARENT, 10, { endDate: '2026-01-01' })).rejects.toThrow(DomainValidation);
  });

  it('sin campos → DomainValidation', async () => {
    const repo = repoMock();
    const uc = new UpdateBookUseCase(repo as unknown as BookRepository);
    repo.findById.mockResolvedValue(makeBook());
    await expect(uc.execute(PARENT, 10, {})).rejects.toThrow(DomainValidation);
  });
});

describe('DeleteBookUseCase', () => {
  it('borra un libro propio', async () => {
    const repo = repoMock();
    const uc = new DeleteBookUseCase(repo as unknown as BookRepository);
    repo.findById.mockResolvedValue(makeBook());
    await uc.execute(PARENT, 10);
    expect(repo.delete).toHaveBeenCalledWith(10, 5);
  });

  it('otro usuario no puede borrar el libro', async () => {
    const repo = repoMock();
    const uc = new DeleteBookUseCase(repo as unknown as BookRepository);
    repo.findById.mockResolvedValue(makeBook({ ownerUserId: 5 }));
    await expect(uc.execute(OTHER, 10)).rejects.toThrow(OwnershipError);
    expect(repo.delete).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  CreateChildUseCase,
  GetMeUseCase,
  ListChildrenUseCase,
  LoginUseCase,
  RegisterParentUseCase,
} from '../domain/users/use-cases';
import {
  AuthenticationError,
  ConflictError,
  DomainNotFound,
  DomainValidation,
  OwnershipError,
} from '../domain/shared/domain-errors';
import { hashPassword } from '../domain/users/password.util';
import type { UserRepository } from '../domain/users/user.repository';
import type { SafeUser, UserRecord } from '../domain/users/user.entity';

/**
 * Tests de dominio de Auth + Users (Fase 3, refactorizados a 3 capas en
 * Fase 5). TDD: escritos junto con la implementación de los use cases.
 * Sin NestJS ni Prisma: solo interfaces del dominio + mocks manuales.
 */

function repoMock() {
  return {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    listChildren: vi.fn(),
    createParent: vi.fn(),
    createChild: vi.fn(),
  };
}

const PARENT: SafeUser = { id: 5, name: 'María', email: 'maria@test.com', role: 'PARENT', parentId: null };
const CHILD: SafeUser = { id: 9, name: 'Lucas', email: 'lucas@test.com', role: 'CHILD', parentId: 5 };

describe('RegisterParentUseCase', () => {
  it('crea un PARENT con hash scrypt (no texto plano)', async () => {
    const repo = repoMock();
    const uc = new RegisterParentUseCase(repo as unknown as UserRepository);
    repo.findByEmail.mockResolvedValue(null);
    repo.createParent.mockImplementation((input) =>
      Promise.resolve({ id: 10, name: input.name, email: input.email, role: 'PARENT', parentId: null }),
    );

    const user = await uc.execute({ name: 'Ana Madre', email: 'ana@test.com', password: 'supersecreta' });

    const created = repo.createParent.mock.calls[0][0];
    expect(created.passwordHash).not.toContain('supersecreta');
    expect(created.passwordHash).toHaveLength(161); // 32hex + ':' + 128hex
    expect(user.role).toBe('PARENT');
    expect(user.email).toBe('ana@test.com');
  });

  it('lanza ConflictError si el email ya existe', async () => {
    const repo = repoMock();
    const uc = new RegisterParentUseCase(repo as unknown as UserRepository);
    repo.findByEmail.mockResolvedValue(PARENT as unknown as UserRecord);
    await expect(
      uc.execute({ name: 'Ana', email: 'maria@test.com', password: 'contrasena123' }),
    ).rejects.toThrow(ConflictError);
    expect(repo.createParent).not.toHaveBeenCalled();
  });

  it('lanza DomainValidation si la contraseña es demasiado corta (<8)', async () => {
    const repo = repoMock();
    const uc = new RegisterParentUseCase(repo as unknown as UserRepository);
    await expect(
      uc.execute({ name: 'Ana', email: 'ana2@test.com', password: 'cort' }),
    ).rejects.toThrow(DomainValidation);
    expect(repo.createParent).not.toHaveBeenCalled();
  });
});

describe('LoginUseCase', () => {
  it('devuelve el SafeUser (sin passwordHash) para credenciales válidas', async () => {
    const repo = repoMock();
    const uc = new LoginUseCase(repo as unknown as UserRepository);
    repo.findByEmail.mockResolvedValue({ ...PARENT, passwordHash: hashPassword('clavesegura') });

    const user = await uc.execute({ email: 'maria@test.com', password: 'clavesegura' });

    expect(user).toEqual(expect.objectContaining({ id: 5, email: 'maria@test.com', role: 'PARENT' }));
    expect(JSON.stringify(user)).not.toContain('passwordHash');
  });

  it('lanza AuthenticationError si la contraseña es incorrecta', async () => {
    const repo = repoMock();
    const uc = new LoginUseCase(repo as unknown as UserRepository);
    repo.findByEmail.mockResolvedValue({ ...PARENT, passwordHash: hashPassword('otra-cosa') });
    await expect(
      uc.execute({ email: 'maria@test.com', password: 'clavesegura' }),
    ).rejects.toThrow(AuthenticationError);
  });

  it('lanza AuthenticationError si el email no existe', async () => {
    const repo = repoMock();
    const uc = new LoginUseCase(repo as unknown as UserRepository);
    repo.findByEmail.mockResolvedValue(null);
    await expect(
      uc.execute({ email: 'nadie@test.com', password: 'clavesegura' }),
    ).rejects.toThrow(AuthenticationError);
  });
});

describe('GetMeUseCase', () => {
  it('devuelve el usuario autenticado', async () => {
    const repo = repoMock();
    const uc = new GetMeUseCase(repo as unknown as UserRepository);
    repo.findById.mockResolvedValue(CHILD);
    const user = await uc.execute(9);
    expect(user).toEqual(CHILD);
  });

  it('lanza DomainNotFound si el usuario no existe', async () => {
    const repo = repoMock();
    const uc = new GetMeUseCase(repo as unknown as UserRepository);
    repo.findById.mockResolvedValue(null);
    await expect(uc.execute(999)).rejects.toThrow(DomainNotFound);
  });
});

describe('ListChildrenUseCase (solo padre, sus propios hijos)', () => {
  it('devuelve los hijos del parentId indicado', async () => {
    const repo = repoMock();
    const uc = new ListChildrenUseCase(repo as unknown as UserRepository);
    repo.findById.mockResolvedValue(PARENT);
    repo.listChildren.mockResolvedValue([CHILD]);

    const children = await uc.execute(5);
    expect(repo.listChildren).toHaveBeenCalledWith(5);
    expect(children).toEqual([CHILD]);
  });

  it('lanza OwnershipError si el actor no es PARENT', async () => {
    const repo = repoMock();
    const uc = new ListChildrenUseCase(repo as unknown as UserRepository);
    repo.findById.mockResolvedValue(CHILD);
    await expect(uc.execute(9)).rejects.toThrow(OwnershipError);
    expect(repo.listChildren).not.toHaveBeenCalled();
  });
});

describe('CreateChildUseCase (solo padre)', () => {
  it('crea un CHILD ligado al parentId con contraseña scrypt', async () => {
    const repo = repoMock();
    const uc = new CreateChildUseCase(repo as unknown as UserRepository);
    repo.findById.mockResolvedValue(PARENT);
    repo.findByEmail.mockResolvedValue(null);
    repo.createChild.mockImplementation((input) =>
      Promise.resolve({ id: 8, name: input.name, email: input.email, role: 'CHILD', parentId: input.parentId }),
    );

    const child = await uc.execute(5, { name: 'Lola', email: 'nueva@test.com', password: 'clave123' });

    const created = repo.createChild.mock.calls[0][0];
    expect(created.passwordHash).not.toContain('clave123');
    expect(created.passwordHash).toHaveLength(161);
    expect(created.parentId).toBe(5);
    expect(child.role).toBe('CHILD');
    expect(child.parentId).toBe(5);
  });

  it('lanza ConflictError si el email ya está registrado', async () => {
    const repo = repoMock();
    const uc = new CreateChildUseCase(repo as unknown as UserRepository);
    repo.findById.mockResolvedValue(PARENT);
    repo.findByEmail.mockResolvedValue({ ...CHILD, passwordHash: 'x' });
    await expect(
      uc.execute(5, { name: 'X', email: 'existe@test.com', password: 'clave123' }),
    ).rejects.toThrow(ConflictError);
    expect(repo.createChild).not.toHaveBeenCalled();
  });

  it('lanza OwnershipError si el parentId no es un PARENT', async () => {
    const repo = repoMock();
    const uc = new CreateChildUseCase(repo as unknown as UserRepository);
    repo.findById.mockResolvedValue(CHILD);
    await expect(
      uc.execute(9, { name: 'X', email: 'y@test.com', password: 'clave123' }),
    ).rejects.toThrow(OwnershipError);
  });

  it('lanza DomainNotFound si el parentId no existe', async () => {
    const repo = repoMock();
    const uc = new CreateChildUseCase(repo as unknown as UserRepository);
    repo.findById.mockResolvedValue(null);
    await expect(
      uc.execute(999, { name: 'X', email: 'z@test.com', password: 'clave123' }),
    ).rejects.toThrow(DomainNotFound);
  });

  it('lanza DomainValidation si la contraseña es demasiado corta', async () => {
    const repo = repoMock();
    const uc = new CreateChildUseCase(repo as unknown as UserRepository);
    await expect(
      uc.execute(5, { name: 'X', email: 'z@test.com', password: 'cort' }),
    ).rejects.toThrow(DomainValidation);
    expect(repo.findById).not.toHaveBeenCalled();
  });
});

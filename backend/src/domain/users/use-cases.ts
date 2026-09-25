import type { SafeUser } from './user.entity';
import type { UserRepository } from './user.repository';
import type { Gender } from '../shared/role.types';
import { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH } from './password.util';
import {
  AuthenticationError,
  ConflictError,
  DomainNotFound,
  DomainValidation,
  OwnershipError,
} from '../shared/domain-errors';

/**
 * Use cases de Auth + Users (Fase 3, refactorizados a 3 capas en Fase 5).
 *
 * Reglas de negocio:
 *  - `register` crea siempre un PARENT (`parentId = null`).
 *  - `createChild` crea un CHILD ligado al `parentId` del actor; el actor
 *    debe existir y tener rol PARENT.
 *  - Contraseña mínima 8 caracteres (defensa en profundidad; el DTO ya
 *    valida en el borde HTTP).
 *  - Email único en toda la tabla de usuarios (padres e hijos comparten
 *    espacio de emails).
 */

function assertPasswordLength(password: string): void {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new DomainValidation(
      `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
    );
  }
}

// ─────────────────────────── register (PARENT) ───────────────────────────

export class RegisterParentUseCase {
  constructor(private readonly repo: UserRepository) {}

  async execute(input: { name: string; email: string; password: string; gender: Gender }): Promise<SafeUser> {
    assertPasswordLength(input.password);
    const existing = await this.repo.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('El email ya está registrado');
    }
    return this.repo.createParent({
      name: input.name,
      email: input.email,
      passwordHash: hashPassword(input.password),
      gender: input.gender,
    });
  }
}

// ─────────────────────────── login ───────────────────────────

export class LoginUseCase {
  constructor(private readonly repo: UserRepository) {}

  /** Mensaje genérico: no diferenciamos "email no existe" y "password mal". */
  async execute(input: { email: string; password: string }): Promise<SafeUser> {
    const user = await this.repo.findByEmail(input.email);
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new AuthenticationError('Credenciales inválidas');
    }
    const { passwordHash: _drop, ...safe } = user;
    return safe;
  }
}

// ─────────────────────────── me ───────────────────────────

export class GetMeUseCase {
  constructor(private readonly repo: UserRepository) {}

  async execute(userId: number): Promise<SafeUser> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new DomainNotFound('Usuario no encontrado', 'user');
    }
    return user;
  }
}

// ─────────────────────────── listChildren ───────────────────────────

export class ListChildrenUseCase {
  constructor(private readonly repo: UserRepository) {}

  async execute(parentId: number): Promise<SafeUser[]> {
    await assertIsParent(this.repo, parentId);
    return this.repo.listChildren(parentId);
  }
}

// ─────────────────────────── createChild ───────────────────────────

export class CreateChildUseCase {
  constructor(private readonly repo: UserRepository) {}

  async execute(
    parentId: number,
    input: { name: string; email: string; password: string; gender: Gender },
  ): Promise<SafeUser> {
    assertPasswordLength(input.password);
    await assertIsParent(this.repo, parentId);
    const existing = await this.repo.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('El email ya está registrado');
    }
    return this.repo.createChild({
      name: input.name,
      email: input.email,
      passwordHash: hashPassword(input.password),
      gender: input.gender,
      parentId,
    });
  }
}

/**
 * El parentId debe existir y su rol debe ser PARENT.
 * Única fuente de la regla padre→hijo del dominio.
 */
async function assertIsParent(repo: UserRepository, parentId: number): Promise<void> {
  const parent = await repo.findById(parentId);
  if (!parent) {
    throw new DomainNotFound('Padre no encontrado', 'user');
  }
  if (parent.role !== 'PARENT') {
    throw new OwnershipError('Solo un padre puede gestionar cuentas de hijos');
  }
}

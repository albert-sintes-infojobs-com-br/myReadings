import type { SafeUser, UserRecord } from './user.entity';

/** Token de inyección del repo (interfaces no existen en runtime). */
export const USER_REPOSITORY = 'USER_REPOSITORY';

export interface CreateParentInput {
  name: string;
  email: string;
  passwordHash: string;
}

export interface CreateChildInput {
  name: string;
  email: string;
  passwordHash: string;
  parentId: number;
}

/**
 * Contrato de acceso a persistencia de usuarios (padres e hijos).
 * Implementado con Prisma en `src/persistence/users`.
 */
export interface UserRepository {
  /** Incluye `passwordHash` — solo para verificar credenciales en login. */
  findByEmail(email: string): Promise<UserRecord | null>;
  /** Proyección segura (sin hash) — perfil, checks de rol/propiedad. */
  findById(id: number): Promise<SafeUser | null>;
  listChildren(parentId: number): Promise<SafeUser[]>;
  createParent(input: CreateParentInput): Promise<SafeUser>;
  createChild(input: CreateChildInput): Promise<SafeUser>;
}

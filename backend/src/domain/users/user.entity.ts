import type { Role } from '../shared/role.types';

/**
 * Proyección segura de usuario (SIN `passwordHash`). Es lo único que
 * cruza hacia el transporte / las respuestas HTTP.
 */
export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  parentId: number | null;
}

/** Registro completo tal como lo necesita el dominio para verificar login. */
export interface UserRecord extends SafeUser {
  passwordHash: string;
}

import type { Role } from './role.types';

/**
 * Vista mínima del usuario autenticado que necesitan los use cases
 * (sin contraseña, sin datos sensibles). La resuelve la capa de
 * transporte desde el JWT / la BD y se la pasa al dominio.
 */
export interface ActorView {
  id: number;
  role: Role;
  /** Id del padre (CHILD → padre; PARENT → null). */
  parentId: number | null;
}

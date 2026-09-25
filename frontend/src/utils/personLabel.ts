import type { Gender, Role } from '../types/auth';

/** Resuelve la etiqueta de rol+género: Padre/Madre o Hijo/Hija. */
export function personLabel(role: Role, gender: Gender): string {
  if (role === 'PARENT') return gender === 'FEMALE' ? 'Madre' : 'Padre';
  return gender === 'FEMALE' ? 'Hija' : 'Hijo';
}

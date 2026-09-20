import * as crypto from 'node:crypto';

/**
 * Hashing de contraseñas (scrypt nativo, `node:crypto`). Vive en el
 * dominio porque `node:crypto` es una API del runtime de Node, no de
 * NestJS ni de Prisma — no rompe la regla de capas.
 *
 * Formato: `saltHex:hashHex` (32 + 1 + 128 = 161 chars). MISMO formato
 * que `prisma/seed.ts` — imprescindible para que las cuentas seedeadas
 * puedan hacer login.
 */
export const MIN_PASSWORD_LENGTH = 8;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Constant-time comparison vía scryptSync + crypto.timingSafeEqual.
 * Devuelve false para hashes malformados sin lanzar — evita oracles de timing.
 */
export function verifyPassword(password: string, passwordHash: string): boolean {
  if (!passwordHash) return false;
  const sep = passwordHash.indexOf(':');
  if (sep <= 0 || sep === passwordHash.length - 1) return false;
  const saltHex = passwordHash.slice(0, sep);
  const expectedHash = passwordHash.slice(sep + 1);
  if (saltHex.length !== 32 || expectedHash.length !== 128) return false;
  try {
    const expected = Buffer.from(expectedHash, 'hex');
    const actual = crypto.scryptSync(password, saltHex, 64);
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

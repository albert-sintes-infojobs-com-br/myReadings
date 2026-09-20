/**
 * Entidad de dominio: Categoría de lectura.
 *
 * Propia del dominio (src/domain): sin dependencias de NestJS ni Prisma.
 * `categoryId` es un alias del id numérico interno: el dominio habla de
 * "categoría" sin asumer cómo se persiste.
 */
export interface Category {
  id: number;
  ownerUserId: number;
  title: string;
  description?: string | null;
  colorHex: string;
  createdAt: Date;
}

export function categoryNameOf(c: Category): string {
  return c.title;
}

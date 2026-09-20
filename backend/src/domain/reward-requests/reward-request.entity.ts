/**
 * Entidad de dominio: Solicitud de recompensa (hijo → padre).
 * Sin dependencias de NestJS ni Prisma.
 */
export type RewardRequestStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED';

export interface RewardRequest {
  id: number;
  bookId: number;
  childId: number;
  status: RewardRequestStatus;
  createdAt: Date;
  resolvedAt: Date | null;
}

/**
 * Entidad de dominio: Movimiento del ledger (saldo de puntos/euros).
 *
 * Sin dependencias de NestJS ni Prisma.
 */
export type LedgerKind = 'POINTS' | 'MONEY';
export type LedgerReason = 'FULFILLED' | 'PENALTY' | 'REDEMPTION';

export interface LedgerEntry {
  id: number;
  childId: number;
  rewardId: number | null;
  kind: LedgerKind;
  amount: number;
  goalId: number | null;
  reason: LedgerReason;
  createdAt: Date;
}

import type { LedgerEntry, LedgerKind, LedgerReason } from './ledger-entry.entity';

/** Token de inyección del repo (interfaces no existen en runtime). */
export const LEDGER_REPOSITORY = 'LEDGER_REPOSITORY';

export interface CreateLedgerEntryInput {
  childId: number;
  rewardId?: number | null;
  kind: LedgerKind;
  amount: number;
  goalId?: number | null;
  reason: LedgerReason;
}

/**
 * Contrato de acceso a persistencia del ledger.
 *
 * El saldo (`points`/`money`) y el progreso de una meta NO se guardan
 * como columna: se derivan sumando `LedgerEntry.amount` (positivo en
 * cumplimiento, negativo en penalización/canje).
 */
export interface LedgerRepository {
  create(input: CreateLedgerEntryInput): Promise<LedgerEntry>;
  /** Saldo de un hijo para un tipo (POINTS o MONEY). */
  sumByChild(childId: number, kind: LedgerKind): Promise<number>;
  /** Puntos acumulados hacia una meta concreta (suma de sus LedgerEntry). */
  sumByGoal(goalId: number): Promise<number>;
  listByChild(childId: number): Promise<LedgerEntry[]>;
}

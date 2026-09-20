import type { Reward } from '../rewards/reward.entity';
import type { RewardRepository } from '../rewards/reward.repository';
import type { Book } from '../books/book.entity';
import type { BookRepository } from '../books/book.repository';
import type { Goal } from '../goals/goal.entity';
import type { GoalRepository } from '../goals/goal.repository';
import { assertOwnsChild } from '../goals/use-cases';
import type { UserRepository } from '../users/user.repository';
import type { LedgerRepository } from './ledger.repository';
import type { LedgerEntry } from './ledger-entry.entity';
import type { NotificationRepository } from '../notifications/notification.repository';
import { ConflictError, DomainNotFound } from '../shared/domain-errors';
import type { ActorView } from '../shared/actor';
import { todayStr } from '../shared/date.util';

/**
 * Motor de resolución de recompensas + Ledger (Fase 8).
 *
 * Reglas de negocio (ver docs/03-reglas-de-negocio.md):
 *  - Cumplimiento inmediato: si el libro está `FINISHED` y hoy <= `deadline`,
 *    la recompensa pasa a `FULFILLED` y se registra una `LedgerEntry`
 *    positiva. Si es `POINTS` con `goalId`, se comprueba si la meta llega
 *    a `targetPoints` (suma de su ledger) → `Goal.status = ACHIEVED`.
 *  - Penalización: si `hoy > deadline` (el libro no se terminó a tiempo,
 *    esté o no `FINISHED`), la recompensa pasa a `PENALIZED`; si tiene
 *    `penaltyValue`, se registra una `LedgerEntry` negativa.
 *  - Ambas reglas comparten la MISMA función (`resolvePendingReward`):
 *    la dispara el use case "libro terminado" (inmediato) o la tarea
 *    programada diaria (`PenalizeOverdueRewardsUseCase`), lo que ocurra
 *    primero.
 *  - Canje de meta: solo si `status === 'ACHIEVED'`; registra una
 *    `LedgerEntry` negativa (`REDEMPTION`) y pasa la meta a `REDEEMED`.
 *  - El saldo (`GetMyBalanceUseCase`/`GetChildLedgerUseCase`) se DERIVA
 *    sumando `LedgerEntry.amount`, nunca se guarda como columna.
 *  - Cada resolución genera además una `Notification` in-app (Fase 9):
 *    `REWARD_FULFILLED`/`REWARD_PENALIZED` al hijo; `GOAL_ACHIEVED` al
 *    hijo Y al padre que creó la meta.
 */

type ResolutionOutcome = 'FULFILLED' | 'PENALIZED' | 'NONE';

async function resolvePendingReward(
  reward: Reward,
  book: Book,
  rewards: RewardRepository,
  goals: GoalRepository,
  ledger: LedgerRepository,
  notifications: NotificationRepository,
): Promise<ResolutionOutcome> {
  if (reward.status !== 'PENDING') return 'NONE';
  const today = todayStr();

  if (book.status === 'FINISHED' && today <= reward.deadline) {
    await rewards.resolve(reward.id, 'FULFILLED', new Date());
    await ledger.create({
      childId: book.ownerUserId,
      rewardId: reward.id,
      kind: reward.type,
      amount: reward.value,
      goalId: reward.goalId,
      reason: 'FULFILLED',
    });
    await notifications.create({
      recipientUserId: book.ownerUserId,
      type: 'REWARD_FULFILLED',
      refBookId: book.id,
      refRewardId: reward.id,
      message: 'Tu recompensa se ha cumplido',
    });
    if (reward.type === 'POINTS' && reward.goalId) {
      const goal = await goals.findById(reward.goalId);
      if (goal && goal.status === 'ACTIVE') {
        const accumulated = await ledger.sumByGoal(reward.goalId);
        if (accumulated >= goal.targetPoints) {
          await goals.setStatus(goal.id, 'ACHIEVED');
          await notifications.create({
            recipientUserId: goal.childId,
            type: 'GOAL_ACHIEVED',
            message: `¡Meta "${goal.name}" alcanzada!`,
          });
          await notifications.create({
            recipientUserId: goal.createdByParentId,
            type: 'GOAL_ACHIEVED',
            message: `Tu hijo ha alcanzado la meta "${goal.name}"`,
          });
        }
      }
    }
    return 'FULFILLED';
  }

  if (today > reward.deadline) {
    await rewards.resolve(reward.id, 'PENALIZED', new Date());
    if (reward.penaltyValue !== null) {
      await ledger.create({
        childId: book.ownerUserId,
        rewardId: reward.id,
        kind: reward.type,
        amount: -reward.penaltyValue,
        goalId: reward.goalId,
        reason: 'PENALTY',
      });
    }
    await notifications.create({
      recipientUserId: book.ownerUserId,
      type: 'REWARD_PENALIZED',
      refBookId: book.id,
      refRewardId: reward.id,
      message: 'Tu recompensa ha sido penalizada por no cumplir el plazo',
    });
    return 'PENALIZED';
  }

  return 'NONE'; // sigue pendiente: ni cumplida a tiempo ni vencida todavía
}

// ─────────────────────────── Resolución inmediata (libro → FINISHED) ───────────────────────────

export class ResolveBookFinishedUseCase {
  constructor(
    private readonly rewards: RewardRepository,
    private readonly books: BookRepository,
    private readonly goals: GoalRepository,
    private readonly ledger: LedgerRepository,
    private readonly notifications: NotificationRepository,
  ) {}

  /** Se invoca (desde el transporte) tras un `PATCH /books/:id` que deja `status = FINISHED`. */
  async execute(bookId: number): Promise<void> {
    const book = await this.books.findByIdAny(bookId);
    if (!book) return;
    const pending = await this.rewards.listPendingByBook(bookId);
    for (const reward of pending) {
      await resolvePendingReward(reward, book, this.rewards, this.goals, this.ledger, this.notifications);
    }
  }
}

// ─────────────────────────── Tarea programada diaria (vencimientos) ───────────────────────────

export class PenalizeOverdueRewardsUseCase {
  constructor(
    private readonly rewards: RewardRepository,
    private readonly books: BookRepository,
    private readonly goals: GoalRepository,
    private readonly ledger: LedgerRepository,
    private readonly notifications: NotificationRepository,
  ) {}

  async execute(): Promise<{ fulfilled: number; penalized: number }> {
    const pending = await this.rewards.listAllPending();
    let fulfilled = 0;
    let penalized = 0;
    for (const reward of pending) {
      const book = await this.books.findByIdAny(reward.bookId);
      if (!book) continue; // huérfana (no debería ocurrir: FK cascade)
      const outcome = await resolvePendingReward(reward, book, this.rewards, this.goals, this.ledger, this.notifications);
      if (outcome === 'FULFILLED') fulfilled += 1;
      else if (outcome === 'PENALIZED') penalized += 1;
    }
    return { fulfilled, penalized };
  }
}

// ─────────────────────────── Canje de meta ───────────────────────────

export class RedeemGoalUseCase {
  constructor(
    private readonly goals: GoalRepository,
    private readonly ledger: LedgerRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(actor: ActorView, goalId: number): Promise<Goal> {
    const goal = await this.goals.findById(goalId);
    if (!goal) {
      throw new DomainNotFound('Meta no encontrada', 'goal');
    }
    await assertOwnsChild(this.users, actor, goal.childId);
    if (goal.status !== 'ACHIEVED') {
      throw new ConflictError('La meta debe estar en estado ACHIEVED para poder canjearla');
    }
    await this.ledger.create({
      childId: goal.childId,
      rewardId: null,
      kind: 'POINTS',
      amount: -goal.targetPoints,
      goalId: goal.id,
      reason: 'REDEMPTION',
    });
    return this.goals.setStatus(goal.id, 'REDEEMED');
  }
}

// ─────────────────────────── Saldo ───────────────────────────

export interface Balance {
  points: number;
  money: number;
}

export class GetMyBalanceUseCase {
  constructor(private readonly ledger: LedgerRepository) {}

  async execute(actor: ActorView): Promise<Balance> {
    const [points, money] = await Promise.all([
      this.ledger.sumByChild(actor.id, 'POINTS'),
      this.ledger.sumByChild(actor.id, 'MONEY'),
    ]);
    return { points, money };
  }
}

export class GetChildLedgerUseCase {
  constructor(
    private readonly ledger: LedgerRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(actor: ActorView, childId: number): Promise<{ balance: Balance; entries: LedgerEntry[] }> {
    await assertOwnsChild(this.users, actor, childId);
    const [points, money, entries] = await Promise.all([
      this.ledger.sumByChild(childId, 'POINTS'),
      this.ledger.sumByChild(childId, 'MONEY'),
      this.ledger.listByChild(childId),
    ]);
    return { balance: { points, money }, entries };
  }
}

import type { Reward } from './reward.entity';
import type {
  CreateRewardInput,
  RewardRepository,
  UpdateRewardInput,
} from './reward.repository';
import type { Book } from '../books/book.entity';
import type { BookRepository } from '../books/book.repository';
import type { GoalRepository } from '../goals/goal.repository';
import type { UserRepository } from '../users/user.repository';
import {
  ConflictError,
  DomainNotFound,
  DomainValidation,
  OwnershipError,
} from '../shared/domain-errors';
import type { ActorView } from '../shared/actor';
import { todayStr } from '../shared/date.util';

/**
 * Use cases de Recompensas (Fase 7).
 *
 * Reglas de negocio (ver docs/03-reglas-de-negocio.md):
 *  - Solo PARENT crea/edita/elimina, y solo sobre libros de sus propios
 *    hijos (`book.ownerUserId` es un CHILD cuyo `parentId === actor.id`).
 *  - Solo se puede crear/editar/eliminar mientras el libro sigue en
 *    `NOT_STARTED` (si pasó a READING/FINISHED, se rechaza con 409).
 *  - `deadline` debe ser una fecha futura (al crear, y al cambiarla).
 *  - `value` > 0; `penaltyValue` (si se indica) > 0.
 *  - Tipo `POINTS` requiere `goalId` de una meta del MISMO hijo.
 *  - Listado/detalle: el padre ve las de sus hijos; el hijo ve las suyas
 *    (privacidad: 404 en vez de 403, igual que en `books`).
 *
 * La resolución (FULFILLED/PENALIZED) y el ledger son la Fase 8: aquí una
 * recompensa creada siempre empieza en `PENDING`.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isFutureDate(dateStr: string): boolean {
  return dateStr > todayStr();
}

function assertValidCommon(
  input: { value?: number; deadline?: string; penaltyValue?: number | null },
  opts: { requireFutureDeadline: boolean },
): void {
  if (input.value !== undefined && !(input.value > 0)) {
    throw new DomainValidation('value debe ser mayor que 0');
  }
  if (
    input.penaltyValue !== undefined &&
    input.penaltyValue !== null &&
    !(input.penaltyValue > 0)
  ) {
    throw new DomainValidation('penaltyValue debe ser mayor que 0');
  }
  if (input.deadline !== undefined) {
    if (!DATE_RE.test(input.deadline) || Number.isNaN(new Date(input.deadline).getTime())) {
      throw new DomainValidation('deadline debe tener formato YYYY-MM-DD');
    }
    if (opts.requireFutureDeadline && !isFutureDate(input.deadline)) {
      throw new DomainValidation('deadline debe ser una fecha futura');
    }
  }
}

/** El libro debe existir y pertenecer a un hijo del actor (PARENT). 403 si no. */
async function assertBookOwnedByActorsChild(
  books: BookRepository,
  users: UserRepository,
  actor: ActorView,
  bookId: number,
): Promise<Book> {
  const book = await books.findByIdAny(bookId);
  if (!book) {
    throw new DomainNotFound('Libro no encontrado', 'book');
  }
  const owner = await users.findById(book.ownerUserId);
  if (!owner || owner.role !== 'CHILD' || owner.parentId !== actor.id) {
    throw new OwnershipError('Ese libro no pertenece a un hijo tuyo');
  }
  return book;
}

/** `goalId` debe ser una meta existente perteneciente al mismo hijo dueño del libro. */
async function assertGoalBelongsToChild(
  goals: GoalRepository,
  childId: number,
  goalId: number,
): Promise<void> {
  const goal = await goals.findById(goalId);
  if (!goal || goal.childId !== childId) {
    throw new DomainValidation('goalId no pertenece a una meta del mismo hijo');
  }
}

// ─────────────────────────── Create ───────────────────────────

export class CreateRewardUseCase {
  constructor(
    private readonly rewards: RewardRepository,
    private readonly books: BookRepository,
    private readonly goals: GoalRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(actor: ActorView, bookId: number, input: CreateRewardInput): Promise<Reward> {
    if (!input.type || input.value === undefined || !input.deadline) {
      throw new DomainValidation('type, value y deadline son obligatorios');
    }
    assertValidCommon(input, { requireFutureDeadline: true });
    if (input.type === 'POINTS' && !input.goalId) {
      throw new DomainValidation('goalId es obligatorio para recompensas de tipo POINTS');
    }

    const book = await assertBookOwnedByActorsChild(this.books, this.users, actor, bookId);
    if (book.status !== 'NOT_STARTED') {
      throw new ConflictError('El libro debe estar en NOT_STARTED para crear una recompensa');
    }
    if (input.type === 'POINTS') {
      await assertGoalBelongsToChild(this.goals, book.ownerUserId, input.goalId as number);
    }

    return this.rewards.create(
      {
        type: input.type,
        value: input.value,
        deadline: input.deadline,
        penaltyValue: input.penaltyValue ?? null,
        goalId: input.type === 'POINTS' ? (input.goalId as number) : null,
      },
      bookId,
      actor.id,
    );
  }
}

// ─────────────────────────── List ───────────────────────────

export class ListRewardsUseCase {
  constructor(private readonly rewards: RewardRepository) {}

  /** Padre: recompensas de libros de CUALQUIERA de sus hijos. Hijo: las suyas. */
  async execute(actor: ActorView): Promise<Reward[]> {
    return actor.role === 'CHILD'
      ? this.rewards.listByBookOwner(actor.id)
      : this.rewards.listByParent(actor.id);
  }
}

// ─────────────────────────── Get ───────────────────────────

export class GetRewardUseCase {
  constructor(
    private readonly rewards: RewardRepository,
    private readonly books: BookRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(actor: ActorView, id: number): Promise<Reward> {
    const reward = await this.rewards.findById(id);
    if (!reward) {
      throw new DomainNotFound('Recompensa no encontrada', 'reward');
    }
    const book = await this.books.findByIdAny(reward.bookId);
    const visible =
      book !== null &&
      (actor.role === 'CHILD'
        ? book.ownerUserId === actor.id
        : (await this.users.findById(book.ownerUserId))?.parentId === actor.id);
    if (!visible) {
      // Privacidad: no revela si la recompensa existe a quien no puede verla.
      throw new DomainNotFound('Recompensa no encontrada', 'reward');
    }
    return reward;
  }
}

// ─────────────────────────── Update ───────────────────────────

export class UpdateRewardUseCase {
  constructor(
    private readonly rewards: RewardRepository,
    private readonly books: BookRepository,
    private readonly goals: GoalRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(actor: ActorView, id: number, patch: UpdateRewardInput): Promise<Reward> {
    if (!patch || typeof patch !== 'object') {
      throw new DomainValidation('Debe indicar al menos un campo a actualizar');
    }
    const reward = await this.rewards.findById(id);
    if (!reward) {
      throw new DomainNotFound('Recompensa no encontrada', 'reward');
    }
    const book = await assertBookOwnedByActorsChild(this.books, this.users, actor, reward.bookId);
    if (book.status !== 'NOT_STARTED') {
      throw new ConflictError('El libro ya no está en NOT_STARTED: no se puede editar la recompensa');
    }
    assertValidCommon(patch, { requireFutureDeadline: patch.deadline !== undefined });

    const effectiveType = patch.type ?? reward.type;
    const effectiveGoalId = patch.goalId !== undefined ? patch.goalId : reward.goalId;
    if (effectiveType === 'POINTS') {
      if (!effectiveGoalId) {
        throw new DomainValidation('goalId es obligatorio para recompensas de tipo POINTS');
      }
      await assertGoalBelongsToChild(this.goals, book.ownerUserId, effectiveGoalId);
    }

    const clean: UpdateRewardInput = {};
    if (patch.type !== undefined) clean.type = patch.type;
    if (patch.value !== undefined) clean.value = patch.value;
    if (patch.deadline !== undefined) clean.deadline = patch.deadline;
    if (patch.penaltyValue !== undefined) clean.penaltyValue = patch.penaltyValue;
    if (patch.goalId !== undefined) clean.goalId = patch.goalId;
    if (Object.keys(clean).length === 0) {
      throw new DomainValidation('Debe indicar al menos un campo a actualizar');
    }
    return this.rewards.update(id, clean);
  }
}

// ─────────────────────────── Delete ───────────────────────────

export class DeleteRewardUseCase {
  constructor(
    private readonly rewards: RewardRepository,
    private readonly books: BookRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(actor: ActorView, id: number): Promise<void> {
    const reward = await this.rewards.findById(id);
    if (!reward) {
      throw new DomainNotFound('Recompensa no encontrada', 'reward');
    }
    const book = await assertBookOwnedByActorsChild(this.books, this.users, actor, reward.bookId);
    if (book.status !== 'NOT_STARTED') {
      throw new ConflictError('El libro ya no está en NOT_STARTED: no se puede eliminar la recompensa');
    }
    await this.rewards.delete(id);
  }
}

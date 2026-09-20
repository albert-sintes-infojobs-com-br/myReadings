import type { Goal } from './goal.entity';
import type {
  CreateGoalInput,
  GoalRepository,
  UpdateGoalInput,
} from './goal.repository';
import type { UserRepository } from '../users/user.repository';
import {
  ConflictError,
  DomainNotFound,
  DomainValidation,
  OwnershipError,
} from '../shared/domain-errors';
import type { ActorView } from '../shared/actor';

/**
 * Use cases de Metas (Fase 6).
 *
 * Reglas de negocio:
 *  - Solo un PARENT crea/edita/elimina metas, y solo de **sus propios**
 *    hijos (`child.parentId === actor.id`).
 *  - `targetPoints`: entero > 0.
 *  - Borrado: se niega (ConflictError) si la meta ya no está `ACTIVE`
 *    (ACHIEVED/REDEEMED implican puntos ya comprometidos/canjeados).
 *  - El hijo solo puede LISTAR sus propias metas (`ListMyGoalsUseCase`).
 *
 * `ACHIEVED`/`REDEEMED` (progreso vía ledger, canje) se gestionan en la
 * Fase 8 (motor de resolución + ledger); aquí una meta creada siempre
 * empieza y permanece `ACTIVE` hasta esa fase.
 */

function assertValidInput(input: { name?: string; targetPoints?: number }): void {
  if (input.name !== undefined && input.name.trim().length === 0) {
    throw new DomainValidation('El nombre debe tener al menos 1 carácter');
  }
  if (
    input.targetPoints !== undefined &&
    (!Number.isInteger(input.targetPoints) || input.targetPoints <= 0)
  ) {
    throw new DomainValidation('targetPoints debe ser un entero mayor que 0');
  }
}

/**
 * El childId indicado debe existir, ser CHILD y tener a `actor` como padre.
 * Exportado: lo reutiliza `domain/ledger` (redeem, ledger de un hijo).
 */
export async function assertOwnsChild(
  userRepo: UserRepository,
  actor: ActorView,
  childId: number,
): Promise<void> {
  const child = await userRepo.findById(childId);
  if (!child) {
    throw new DomainNotFound('Hijo no encontrado', 'user');
  }
  if (child.role !== 'CHILD' || child.parentId !== actor.id) {
    throw new OwnershipError('Ese hijo no está vinculado a tu cuenta');
  }
}

// ─────────────────────────── Create ───────────────────────────

export class CreateGoalUseCase {
  constructor(
    private readonly goals: GoalRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(actor: ActorView, childId: number, input: CreateGoalInput): Promise<Goal> {
    if (!input.name || input.targetPoints === undefined) {
      throw new DomainValidation('name y targetPoints son obligatorios');
    }
    assertValidInput(input);
    await assertOwnsChild(this.users, actor, childId);

    return this.goals.create(
      { name: input.name.trim(), description: input.description ?? null, targetPoints: input.targetPoints },
      childId,
      actor.id,
    );
  }
}

// ─────────────────────────── List (padre → hijo concreto) ───────────────────────────

export class ListChildGoalsUseCase {
  constructor(
    private readonly goals: GoalRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(actor: ActorView, childId: number): Promise<Goal[]> {
    await assertOwnsChild(this.users, actor, childId);
    return this.goals.listByChild(childId);
  }
}

// ─────────────────────────── List (hijo → las suyas) ───────────────────────────

export class ListMyGoalsUseCase {
  constructor(private readonly goals: GoalRepository) {}

  async execute(actor: ActorView): Promise<Goal[]> {
    return this.goals.listByChild(actor.id);
  }
}

// ─────────────────────────── Update ───────────────────────────

export class UpdateGoalUseCase {
  constructor(
    private readonly goals: GoalRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(actor: ActorView, id: number, patch: UpdateGoalInput): Promise<Goal> {
    if (!patch || typeof patch !== 'object') {
      throw new DomainValidation('Debe indicar al menos un campo a actualizar');
    }
    assertValidInput(patch);
    const goal = await this.goals.findById(id);
    if (!goal) {
      throw new DomainNotFound('Meta no encontrada', 'goal');
    }
    await assertOwnsChild(this.users, actor, goal.childId);

    const clean: UpdateGoalInput = {};
    if (patch.name !== undefined) clean.name = patch.name.trim();
    if (patch.description !== undefined) clean.description = patch.description;
    if (patch.targetPoints !== undefined) clean.targetPoints = patch.targetPoints;
    if (Object.keys(clean).length === 0) {
      throw new DomainValidation('Debe indicar al menos un campo a actualizar');
    }
    return this.goals.update(id, clean);
  }
}

// ─────────────────────────── Delete ───────────────────────────

export class DeleteGoalUseCase {
  constructor(
    private readonly goals: GoalRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(actor: ActorView, id: number): Promise<void> {
    const goal = await this.goals.findById(id);
    if (!goal) {
      throw new DomainNotFound('Meta no encontrada', 'goal');
    }
    await assertOwnsChild(this.users, actor, goal.childId);

    if (goal.status !== 'ACTIVE') {
      throw new ConflictError(
        'No se puede eliminar una meta ya alcanzada o canjeada',
      );
    }
    await this.goals.delete(id);
  }
}

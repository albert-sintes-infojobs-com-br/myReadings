import { describe, expect, it, vi } from 'vitest';
import {
  CreateGoalUseCase,
  DeleteGoalUseCase,
  ListChildGoalsUseCase,
  ListMyGoalsUseCase,
  UpdateGoalUseCase,
} from '../domain/goals/use-cases';
import {
  ConflictError,
  DomainNotFound,
  DomainValidation,
  OwnershipError,
} from '../domain/shared/domain-errors';
import type { GoalRepository } from '../domain/goals/goal.repository';
import type { UserRepository } from '../domain/users/user.repository';
import type { Goal } from '../domain/goals/goal.entity';
import type { SafeUser } from '../domain/users/user.entity';
import type { ActorView } from '../domain/shared/actor';

/**
 * Tests de dominio de Metas (Fase 6). TDD: escritos junto con la
 * implementación de los use cases. Sin NestJS ni Prisma.
 */

const PARENT: ActorView = { id: 5, role: 'PARENT', parentId: null };
const OTHER_PARENT: ActorView = { id: 77, role: 'PARENT', parentId: null };
const MY_CHILD: SafeUser = { id: 9, name: 'Lucas', email: 'lucas@test.com', role: 'CHILD', parentId: 5 };

function makeGoal(over: Partial<Goal> = {}): Goal {
  return {
    id: 3,
    childId: 9,
    createdByParentId: 5,
    name: 'Videoconsola',
    description: null,
    targetPoints: 1000,
    status: 'ACTIVE',
    createdAt: new Date('2026-09-01T10:00:00Z'),
    updatedAt: new Date('2026-09-01T10:00:00Z'),
    ...over,
  };
}

function goalsMock() {
  return {
    findById: vi.fn(),
    listByChild: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

function usersMock() {
  return { findByEmail: vi.fn(), findById: vi.fn(), listChildren: vi.fn(), createParent: vi.fn(), createChild: vi.fn() };
}

describe('CreateGoalUseCase', () => {
  it('crea la meta ligada al hijo propio', async () => {
    const goals = goalsMock();
    const users = usersMock();
    users.findById.mockResolvedValue(MY_CHILD);
    goals.create.mockResolvedValue(makeGoal());
    const uc = new CreateGoalUseCase(goals as unknown as GoalRepository, users as unknown as UserRepository);

    await uc.execute(PARENT, 9, { name: 'Videoconsola', targetPoints: 1000 });

    expect(goals.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Videoconsola', targetPoints: 1000 }),
      9,
      5,
    );
  });

  it('rechaza un hijo que no es del actor (OwnershipError)', async () => {
    const goals = goalsMock();
    const users = usersMock();
    users.findById.mockResolvedValue(MY_CHILD); // parentId=5, actor es 77
    const uc = new CreateGoalUseCase(goals as unknown as GoalRepository, users as unknown as UserRepository);

    await expect(uc.execute(OTHER_PARENT, 9, { name: 'X', targetPoints: 100 })).rejects.toThrow(OwnershipError);
    expect(goals.create).not.toHaveBeenCalled();
  });

  it('rechaza childId inexistente (DomainNotFound)', async () => {
    const goals = goalsMock();
    const users = usersMock();
    users.findById.mockResolvedValue(null);
    const uc = new CreateGoalUseCase(goals as unknown as GoalRepository, users as unknown as UserRepository);

    await expect(uc.execute(PARENT, 999, { name: 'X', targetPoints: 100 })).rejects.toThrow(DomainNotFound);
  });

  it.each([0, -5, 1.5])('rechaza targetPoints inválido: %s', async (targetPoints) => {
    const goals = goalsMock();
    const users = usersMock();
    const uc = new CreateGoalUseCase(goals as unknown as GoalRepository, users as unknown as UserRepository);

    await expect(uc.execute(PARENT, 9, { name: 'X', targetPoints })).rejects.toThrow(DomainValidation);
    expect(users.findById).not.toHaveBeenCalled();
  });

  it('rechaza name vacío', async () => {
    const goals = goalsMock();
    const users = usersMock();
    const uc = new CreateGoalUseCase(goals as unknown as GoalRepository, users as unknown as UserRepository);
    await expect(uc.execute(PARENT, 9, { name: '  ', targetPoints: 100 })).rejects.toThrow(DomainValidation);
  });
});

describe('ListChildGoalsUseCase', () => {
  it('lista las metas del hijo propio', async () => {
    const goals = goalsMock();
    const users = usersMock();
    users.findById.mockResolvedValue(MY_CHILD);
    goals.listByChild.mockResolvedValue([makeGoal()]);
    const uc = new ListChildGoalsUseCase(goals as unknown as GoalRepository, users as unknown as UserRepository);

    const list = await uc.execute(PARENT, 9);
    expect(goals.listByChild).toHaveBeenCalledWith(9);
    expect(list).toHaveLength(1);
  });

  it('rechaza listar metas de un hijo ajeno', async () => {
    const goals = goalsMock();
    const users = usersMock();
    users.findById.mockResolvedValue(MY_CHILD);
    const uc = new ListChildGoalsUseCase(goals as unknown as GoalRepository, users as unknown as UserRepository);

    await expect(uc.execute(OTHER_PARENT, 9)).rejects.toThrow(OwnershipError);
  });
});

describe('ListMyGoalsUseCase', () => {
  it('el hijo ve sus propias metas', async () => {
    const goals = goalsMock();
    goals.listByChild.mockResolvedValue([makeGoal()]);
    const uc = new ListMyGoalsUseCase(goals as unknown as GoalRepository);

    const CHILD_ACTOR: ActorView = { id: 9, role: 'CHILD', parentId: 5 };
    const list = await uc.execute(CHILD_ACTOR);
    expect(goals.listByChild).toHaveBeenCalledWith(9);
    expect(list).toHaveLength(1);
  });
});

describe('UpdateGoalUseCase', () => {
  it('actualiza targetPoints de una meta del hijo propio', async () => {
    const goals = goalsMock();
    const users = usersMock();
    goals.findById.mockResolvedValue(makeGoal());
    users.findById.mockResolvedValue(MY_CHILD);
    goals.update.mockResolvedValue(makeGoal({ targetPoints: 1500 }));
    const uc = new UpdateGoalUseCase(goals as unknown as GoalRepository, users as unknown as UserRepository);

    const result = await uc.execute(PARENT, 3, { targetPoints: 1500 });
    expect(goals.update).toHaveBeenCalledWith(3, { targetPoints: 1500 });
    expect(result.targetPoints).toBe(1500);
  });

  it('rechaza editar la meta de un hijo ajeno', async () => {
    const goals = goalsMock();
    const users = usersMock();
    goals.findById.mockResolvedValue(makeGoal());
    users.findById.mockResolvedValue(MY_CHILD);
    const uc = new UpdateGoalUseCase(goals as unknown as GoalRepository, users as unknown as UserRepository);

    await expect(uc.execute(OTHER_PARENT, 3, { targetPoints: 1500 })).rejects.toThrow(OwnershipError);
    expect(goals.update).not.toHaveBeenCalled();
  });

  it('meta inexistente → DomainNotFound', async () => {
    const goals = goalsMock();
    const users = usersMock();
    goals.findById.mockResolvedValue(null);
    const uc = new UpdateGoalUseCase(goals as unknown as GoalRepository, users as unknown as UserRepository);

    await expect(uc.execute(PARENT, 999, { targetPoints: 100 })).rejects.toThrow(DomainNotFound);
  });

  it('sin campos → DomainValidation', async () => {
    const goals = goalsMock();
    const users = usersMock();
    goals.findById.mockResolvedValue(makeGoal());
    users.findById.mockResolvedValue(MY_CHILD);
    const uc = new UpdateGoalUseCase(goals as unknown as GoalRepository, users as unknown as UserRepository);

    await expect(uc.execute(PARENT, 3, {})).rejects.toThrow(DomainValidation);
  });
});

describe('DeleteGoalUseCase', () => {
  it('borra una meta ACTIVE propia', async () => {
    const goals = goalsMock();
    const users = usersMock();
    goals.findById.mockResolvedValue(makeGoal({ status: 'ACTIVE' }));
    users.findById.mockResolvedValue(MY_CHILD);
    const uc = new DeleteGoalUseCase(goals as unknown as GoalRepository, users as unknown as UserRepository);

    await uc.execute(PARENT, 3);
    expect(goals.delete).toHaveBeenCalledWith(3);
  });

  it('rechaza borrar una meta ACHIEVED/REDEEMED (ConflictError)', async () => {
    const goals = goalsMock();
    const users = usersMock();
    goals.findById.mockResolvedValue(makeGoal({ status: 'ACHIEVED' }));
    users.findById.mockResolvedValue(MY_CHILD);
    const uc = new DeleteGoalUseCase(goals as unknown as GoalRepository, users as unknown as UserRepository);

    await expect(uc.execute(PARENT, 3)).rejects.toThrow(ConflictError);
    expect(goals.delete).not.toHaveBeenCalled();
  });

  it('rechaza borrar la meta de un hijo ajeno', async () => {
    const goals = goalsMock();
    const users = usersMock();
    goals.findById.mockResolvedValue(makeGoal());
    users.findById.mockResolvedValue(MY_CHILD);
    const uc = new DeleteGoalUseCase(goals as unknown as GoalRepository, users as unknown as UserRepository);

    await expect(uc.execute(OTHER_PARENT, 3)).rejects.toThrow(OwnershipError);
    expect(goals.delete).not.toHaveBeenCalled();
  });
});

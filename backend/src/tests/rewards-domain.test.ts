import { describe, expect, it, vi } from 'vitest';
import {
  CreateRewardUseCase,
  DeleteRewardUseCase,
  GetRewardUseCase,
  ListRewardsUseCase,
  UpdateRewardUseCase,
} from '../domain/rewards/use-cases';
import {
  ConflictError,
  DomainNotFound,
  DomainValidation,
  OwnershipError,
} from '../domain/shared/domain-errors';
import type { RewardRepository } from '../domain/rewards/reward.repository';
import type { BookRepository } from '../domain/books/book.repository';
import type { GoalRepository } from '../domain/goals/goal.repository';
import type { UserRepository } from '../domain/users/user.repository';
import type { Reward } from '../domain/rewards/reward.entity';
import type { Book } from '../domain/books/book.entity';
import type { Goal } from '../domain/goals/goal.entity';
import type { SafeUser } from '../domain/users/user.entity';
import type { ActorView } from '../domain/shared/actor';

/**
 * Tests de dominio de Recompensas (Fase 7). TDD: escritos junto con la
 * implementación de los use cases. Sin NestJS ni Prisma.
 */

const PARENT: ActorView = { id: 5, role: 'PARENT', parentId: null };
const OTHER_PARENT: ActorView = { id: 77, role: 'PARENT', parentId: null };
const CHILD_ACTOR: ActorView = { id: 9, role: 'CHILD', parentId: 5 };
const OTHER_CHILD_ACTOR: ActorView = { id: 10, role: 'CHILD', parentId: 5 };

const MY_CHILD: SafeUser = { id: 9, name: 'Lucas', email: 'lucas@test.com', role: 'CHILD', parentId: 5 };

const FUTURE = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
const PAST = '2020-01-01';

function makeBook(over: Partial<Book> = {}): Book {
  return {
    id: 10,
    ownerUserId: 9,
    title: 'Dune',
    author: 'Frank Herbert',
    status: 'NOT_STARTED',
    startDate: null,
    endDate: null,
    notes: null,
    rating: null,
    categoryId: null,
    createdAt: new Date('2026-09-01T10:00:00Z'),
    updatedAt: new Date('2026-09-01T10:00:00Z'),
    ...over,
  };
}

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

function makeReward(over: Partial<Reward> = {}): Reward {
  return {
    id: 7,
    bookId: 10,
    createdByParentId: 5,
    type: 'POINTS',
    value: 200,
    deadline: FUTURE,
    penaltyValue: null,
    goalId: 3,
    status: 'PENDING',
    resolvedAt: null,
    createdAt: new Date('2026-09-01T10:00:00Z'),
    updatedAt: new Date('2026-09-01T10:00:00Z'),
    ...over,
  };
}

function rewardsMock() {
  return { findById: vi.fn(), listByBookOwner: vi.fn(), listByParent: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
}
function booksMock() {
  return {
    findById: vi.fn(), findByIdAny: vi.fn(), listByOwner: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
    categoryBelongsToOwner: vi.fn(),
  };
}
function goalsMock() {
  return { findById: vi.fn(), listByChild: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
}
function usersMock() {
  return { findByEmail: vi.fn(), findById: vi.fn(), listChildren: vi.fn(), createParent: vi.fn(), createChild: vi.fn() };
}

describe('CreateRewardUseCase', () => {
  function build() {
    const rewards = rewardsMock();
    const books = booksMock();
    const goals = goalsMock();
    const users = usersMock();
    const uc = new CreateRewardUseCase(
      rewards as unknown as RewardRepository,
      books as unknown as BookRepository,
      goals as unknown as GoalRepository,
      users as unknown as UserRepository,
    );
    return { uc, rewards, books, goals, users };
  }

  it('crea una recompensa POINTS con goalId válido sobre libro NOT_STARTED', async () => {
    const { uc, rewards, books, goals, users } = build();
    books.findByIdAny.mockResolvedValue(makeBook());
    users.findById.mockResolvedValue(MY_CHILD);
    goals.findById.mockResolvedValue(makeGoal());
    rewards.create.mockResolvedValue(makeReward());

    await uc.execute(PARENT, 10, { type: 'POINTS', value: 200, deadline: FUTURE, goalId: 3 });

    expect(rewards.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'POINTS', value: 200, goalId: 3 }),
      10,
      5,
    );
  });

  it('crea una recompensa MONEY sin goalId', async () => {
    const { uc, rewards, books, users } = build();
    books.findByIdAny.mockResolvedValue(makeBook());
    users.findById.mockResolvedValue(MY_CHILD);
    rewards.create.mockResolvedValue(makeReward({ type: 'MONEY', goalId: null }));

    await uc.execute(PARENT, 10, { type: 'MONEY', value: 15.5, deadline: FUTURE });

    expect(rewards.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'MONEY', goalId: null }),
      10,
      5,
    );
  });

  it('POINTS sin goalId → DomainValidation (sin tocar books/goals)', async () => {
    const { uc, books } = build();
    await expect(uc.execute(PARENT, 10, { type: 'POINTS', value: 100, deadline: FUTURE })).rejects.toThrow(DomainValidation);
    expect(books.findByIdAny).not.toHaveBeenCalled();
  });

  it('value <= 0 → DomainValidation', async () => {
    const { uc } = build();
    await expect(uc.execute(PARENT, 10, { type: 'MONEY', value: 0, deadline: FUTURE })).rejects.toThrow(DomainValidation);
  });

  it('deadline pasada → DomainValidation', async () => {
    const { uc } = build();
    await expect(uc.execute(PARENT, 10, { type: 'MONEY', value: 10, deadline: PAST })).rejects.toThrow(DomainValidation);
  });

  it('libro inexistente → DomainNotFound', async () => {
    const { uc, books } = build();
    books.findByIdAny.mockResolvedValue(null);
    await expect(uc.execute(PARENT, 999, { type: 'MONEY', value: 10, deadline: FUTURE })).rejects.toThrow(DomainNotFound);
  });

  it('libro de un hijo ajeno → OwnershipError', async () => {
    const { uc, books, users } = build();
    books.findByIdAny.mockResolvedValue(makeBook());
    users.findById.mockResolvedValue(MY_CHILD); // parentId=5, actor=77
    await expect(uc.execute(OTHER_PARENT, 10, { type: 'MONEY', value: 10, deadline: FUTURE })).rejects.toThrow(OwnershipError);
  });

  it('libro que no está NOT_STARTED → ConflictError', async () => {
    const { uc, books, users } = build();
    books.findByIdAny.mockResolvedValue(makeBook({ status: 'READING' }));
    users.findById.mockResolvedValue(MY_CHILD);
    await expect(uc.execute(PARENT, 10, { type: 'MONEY', value: 10, deadline: FUTURE })).rejects.toThrow(ConflictError);
  });

  it('goalId de una meta de otro hijo → DomainValidation', async () => {
    const { uc, books, users, goals } = build();
    books.findByIdAny.mockResolvedValue(makeBook());
    users.findById.mockResolvedValue(MY_CHILD);
    goals.findById.mockResolvedValue(makeGoal({ childId: 999 }));
    await expect(
      uc.execute(PARENT, 10, { type: 'POINTS', value: 100, deadline: FUTURE, goalId: 3 }),
    ).rejects.toThrow(DomainValidation);
  });
});

describe('ListRewardsUseCase', () => {
  it('el padre ve las recompensas de todos sus hijos', async () => {
    const rewards = rewardsMock();
    rewards.listByParent.mockResolvedValue([makeReward()]);
    const uc = new ListRewardsUseCase(rewards as unknown as RewardRepository);
    const list = await uc.execute(PARENT);
    expect(rewards.listByParent).toHaveBeenCalledWith(5);
    expect(list).toHaveLength(1);
  });

  it('el hijo ve solo las suyas', async () => {
    const rewards = rewardsMock();
    rewards.listByBookOwner.mockResolvedValue([makeReward()]);
    const uc = new ListRewardsUseCase(rewards as unknown as RewardRepository);
    await uc.execute(CHILD_ACTOR);
    expect(rewards.listByBookOwner).toHaveBeenCalledWith(9);
  });
});

describe('GetRewardUseCase', () => {
  it('el hijo propietario del libro ve la recompensa', async () => {
    const rewards = rewardsMock();
    const books = booksMock();
    const users = usersMock();
    rewards.findById.mockResolvedValue(makeReward());
    books.findByIdAny.mockResolvedValue(makeBook());
    const uc = new GetRewardUseCase(rewards as unknown as RewardRepository, books as unknown as BookRepository, users as unknown as UserRepository);

    const reward = await uc.execute(CHILD_ACTOR, 7);
    expect(reward.id).toBe(7);
  });

  it('otro hijo NO ve la recompensa (404, privacidad)', async () => {
    const rewards = rewardsMock();
    const books = booksMock();
    const users = usersMock();
    rewards.findById.mockResolvedValue(makeReward());
    books.findByIdAny.mockResolvedValue(makeBook());
    const uc = new GetRewardUseCase(rewards as unknown as RewardRepository, books as unknown as BookRepository, users as unknown as UserRepository);

    await expect(uc.execute(OTHER_CHILD_ACTOR, 7)).rejects.toThrow(DomainNotFound);
  });

  it('el padre del hijo ve la recompensa', async () => {
    const rewards = rewardsMock();
    const books = booksMock();
    const users = usersMock();
    rewards.findById.mockResolvedValue(makeReward());
    books.findByIdAny.mockResolvedValue(makeBook());
    users.findById.mockResolvedValue(MY_CHILD);
    const uc = new GetRewardUseCase(rewards as unknown as RewardRepository, books as unknown as BookRepository, users as unknown as UserRepository);

    const reward = await uc.execute(PARENT, 7);
    expect(reward.id).toBe(7);
  });

  it('otro padre NO ve la recompensa (404)', async () => {
    const rewards = rewardsMock();
    const books = booksMock();
    const users = usersMock();
    rewards.findById.mockResolvedValue(makeReward());
    books.findByIdAny.mockResolvedValue(makeBook());
    users.findById.mockResolvedValue(MY_CHILD);
    const uc = new GetRewardUseCase(rewards as unknown as RewardRepository, books as unknown as BookRepository, users as unknown as UserRepository);

    await expect(uc.execute(OTHER_PARENT, 7)).rejects.toThrow(DomainNotFound);
  });

  it('recompensa inexistente → DomainNotFound', async () => {
    const rewards = rewardsMock();
    const books = booksMock();
    const users = usersMock();
    rewards.findById.mockResolvedValue(null);
    const uc = new GetRewardUseCase(rewards as unknown as RewardRepository, books as unknown as BookRepository, users as unknown as UserRepository);
    await expect(uc.execute(PARENT, 999)).rejects.toThrow(DomainNotFound);
  });
});

describe('UpdateRewardUseCase', () => {
  function build() {
    const rewards = rewardsMock();
    const books = booksMock();
    const goals = goalsMock();
    const users = usersMock();
    const uc = new UpdateRewardUseCase(
      rewards as unknown as RewardRepository,
      books as unknown as BookRepository,
      goals as unknown as GoalRepository,
      users as unknown as UserRepository,
    );
    return { uc, rewards, books, goals, users };
  }

  it('actualiza value mientras el libro sigue NOT_STARTED', async () => {
    const { uc, rewards, books, users, goals } = build();
    rewards.findById.mockResolvedValue(makeReward());
    books.findByIdAny.mockResolvedValue(makeBook());
    users.findById.mockResolvedValue(MY_CHILD);
    goals.findById.mockResolvedValue(makeGoal());
    rewards.update.mockResolvedValue(makeReward({ value: 300 }));

    const result = await uc.execute(PARENT, 7, { value: 300 });
    expect(rewards.update).toHaveBeenCalledWith(7, { value: 300 });
    expect(result.value).toBe(300);
  });

  it('rechaza si el libro ya no está NOT_STARTED', async () => {
    const { uc, rewards, books, users } = build();
    rewards.findById.mockResolvedValue(makeReward());
    books.findByIdAny.mockResolvedValue(makeBook({ status: 'FINISHED' }));
    users.findById.mockResolvedValue(MY_CHILD);
    await expect(uc.execute(PARENT, 7, { value: 300 })).rejects.toThrow(ConflictError);
    expect(rewards.update).not.toHaveBeenCalled();
  });

  it('rechaza recompensa de un hijo ajeno (OwnershipError)', async () => {
    const { uc, rewards, books, users } = build();
    rewards.findById.mockResolvedValue(makeReward());
    books.findByIdAny.mockResolvedValue(makeBook());
    users.findById.mockResolvedValue(MY_CHILD);
    await expect(uc.execute(OTHER_PARENT, 7, { value: 300 })).rejects.toThrow(OwnershipError);
  });

  it('cambiar a POINTS sin goalId (ni existente) → DomainValidation', async () => {
    const { uc, rewards, books, users } = build();
    rewards.findById.mockResolvedValue(makeReward({ type: 'MONEY', goalId: null }));
    books.findByIdAny.mockResolvedValue(makeBook());
    users.findById.mockResolvedValue(MY_CHILD);
    await expect(uc.execute(PARENT, 7, { type: 'POINTS' })).rejects.toThrow(DomainValidation);
  });

  it('recompensa inexistente → DomainNotFound', async () => {
    const { uc, rewards } = build();
    rewards.findById.mockResolvedValue(null);
    await expect(uc.execute(PARENT, 999, { value: 10 })).rejects.toThrow(DomainNotFound);
  });

  it('sin campos → DomainValidation', async () => {
    const { uc, rewards, books, users } = build();
    rewards.findById.mockResolvedValue(makeReward());
    books.findByIdAny.mockResolvedValue(makeBook());
    users.findById.mockResolvedValue(MY_CHILD);
    await expect(uc.execute(PARENT, 7, {})).rejects.toThrow(DomainValidation);
  });
});

describe('DeleteRewardUseCase', () => {
  it('elimina una recompensa sobre libro NOT_STARTED', async () => {
    const rewards = rewardsMock();
    const books = booksMock();
    const users = usersMock();
    rewards.findById.mockResolvedValue(makeReward());
    books.findByIdAny.mockResolvedValue(makeBook());
    users.findById.mockResolvedValue(MY_CHILD);
    const uc = new DeleteRewardUseCase(rewards as unknown as RewardRepository, books as unknown as BookRepository, users as unknown as UserRepository);

    await uc.execute(PARENT, 7);
    expect(rewards.delete).toHaveBeenCalledWith(7);
  });

  it('rechaza si el libro ya no está NOT_STARTED', async () => {
    const rewards = rewardsMock();
    const books = booksMock();
    const users = usersMock();
    rewards.findById.mockResolvedValue(makeReward());
    books.findByIdAny.mockResolvedValue(makeBook({ status: 'READING' }));
    users.findById.mockResolvedValue(MY_CHILD);
    const uc = new DeleteRewardUseCase(rewards as unknown as RewardRepository, books as unknown as BookRepository, users as unknown as UserRepository);

    await expect(uc.execute(PARENT, 7)).rejects.toThrow(ConflictError);
    expect(rewards.delete).not.toHaveBeenCalled();
  });

  it('rechaza recompensa de un hijo ajeno', async () => {
    const rewards = rewardsMock();
    const books = booksMock();
    const users = usersMock();
    rewards.findById.mockResolvedValue(makeReward());
    books.findByIdAny.mockResolvedValue(makeBook());
    users.findById.mockResolvedValue(MY_CHILD);
    const uc = new DeleteRewardUseCase(rewards as unknown as RewardRepository, books as unknown as BookRepository, users as unknown as UserRepository);

    await expect(uc.execute(OTHER_PARENT, 7)).rejects.toThrow(OwnershipError);
    expect(rewards.delete).not.toHaveBeenCalled();
  });
});

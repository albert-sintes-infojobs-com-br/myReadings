import { describe, expect, it, vi } from 'vitest';
import {
  GetChildLedgerUseCase,
  GetMyBalanceUseCase,
  PenalizeOverdueRewardsUseCase,
  RedeemGoalUseCase,
  ResolveBookFinishedUseCase,
} from '../domain/ledger/use-cases';
import { ConflictError, DomainNotFound, OwnershipError } from '../domain/shared/domain-errors';
import type { RewardRepository } from '../domain/rewards/reward.repository';
import type { BookRepository } from '../domain/books/book.repository';
import type { GoalRepository } from '../domain/goals/goal.repository';
import type { UserRepository } from '../domain/users/user.repository';
import type { LedgerRepository } from '../domain/ledger/ledger.repository';
import type { NotificationRepository } from '../domain/notifications/notification.repository';
import type { Reward } from '../domain/rewards/reward.entity';
import type { Book } from '../domain/books/book.entity';
import type { Goal } from '../domain/goals/goal.entity';
import type { SafeUser } from '../domain/users/user.entity';
import type { ActorView } from '../domain/shared/actor';

/**
 * Tests de dominio del motor de resolución + ledger (Fase 8). TDD: sin
 * NestJS ni Prisma. Las fechas se controlan con strings 'YYYY-MM-DD' fijos
 * en el pasado/futuro (sin necesidad de mockear el reloj del sistema).
 */

const PARENT: ActorView = { id: 5, role: 'PARENT', parentId: null };
const OTHER_PARENT: ActorView = { id: 77, role: 'PARENT', parentId: null };
const MY_CHILD: SafeUser = { id: 9, name: 'Lucas', email: 'lucas@test.com', role: 'CHILD', parentId: 5 };

const FUTURE = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
const PAST = '2020-01-01';

function makeBook(over: Partial<Book> = {}): Book {
  return {
    id: 10, ownerUserId: 9, title: 'Dune', author: 'Frank Herbert', status: 'NOT_STARTED',
    startDate: null, endDate: null, notes: null, rating: null, categoryId: null,
    createdAt: new Date('2026-09-01T10:00:00Z'), updatedAt: new Date('2026-09-01T10:00:00Z'),
    ...over,
  };
}

function makeGoal(over: Partial<Goal> = {}): Goal {
  return {
    id: 3, childId: 9, createdByParentId: 5, name: 'Videoconsola', description: null,
    targetPoints: 300, status: 'ACTIVE',
    createdAt: new Date('2026-09-01T10:00:00Z'), updatedAt: new Date('2026-09-01T10:00:00Z'),
    ...over,
  };
}

function makeReward(over: Partial<Reward> = {}): Reward {
  return {
    id: 7, bookId: 10, createdByParentId: 5, type: 'POINTS', value: 200, deadline: FUTURE,
    penaltyValue: 50, goalId: 3, status: 'PENDING', resolvedAt: null,
    createdAt: new Date('2026-09-01T10:00:00Z'), updatedAt: new Date('2026-09-01T10:00:00Z'),
    ...over,
  };
}

function rewardsMock() {
  return {
    findById: vi.fn(), listByBookOwner: vi.fn(), listByParent: vi.fn(), listPendingByBook: vi.fn(),
    listAllPending: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), resolve: vi.fn(),
  };
}
function booksMock() {
  return {
    findById: vi.fn(), findByIdAny: vi.fn(), listByOwner: vi.fn(), create: vi.fn(), update: vi.fn(),
    delete: vi.fn(), categoryBelongsToOwner: vi.fn(),
  };
}
function goalsMock() {
  return { findById: vi.fn(), listByChild: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), setStatus: vi.fn() };
}
function usersMock() {
  return { findByEmail: vi.fn(), findById: vi.fn(), listChildren: vi.fn(), createParent: vi.fn(), createChild: vi.fn() };
}
function ledgerMock() {
  return { create: vi.fn(), sumByChild: vi.fn(), sumByGoal: vi.fn(), listByChild: vi.fn() };
}
function notificationsMock() {
  return { create: vi.fn(), findById: vi.fn(), listByRecipient: vi.fn(), countUnread: vi.fn(), markRead: vi.fn(), markAllRead: vi.fn() };
}

describe('ResolveBookFinishedUseCase', () => {
  function build() {
    const rewards = rewardsMock();
    const books = booksMock();
    const goals = goalsMock();
    const ledger = ledgerMock();
    const notifications = notificationsMock();
    const uc = new ResolveBookFinishedUseCase(
      rewards as unknown as RewardRepository,
      books as unknown as BookRepository,
      goals as unknown as GoalRepository,
      ledger as unknown as LedgerRepository,
      notifications as unknown as NotificationRepository,
    );
    return { uc, rewards, books, goals, ledger, notifications };
  }

  it('marca FULFILLED y registra LedgerEntry positiva si el libro terminó a tiempo', async () => {
    const { uc, rewards, books, ledger, notifications } = build();
    books.findByIdAny.mockResolvedValue(makeBook({ status: 'FINISHED' }));
    rewards.listPendingByBook.mockResolvedValue([makeReward({ deadline: FUTURE })]);
    ledger.sumByGoal.mockResolvedValue(0);

    await uc.execute(10);

    expect(rewards.resolve).toHaveBeenCalledWith(7, 'FULFILLED', expect.any(Date));
    expect(ledger.create).toHaveBeenCalledWith(
      expect.objectContaining({ childId: 9, rewardId: 7, kind: 'POINTS', amount: 200, reason: 'FULFILLED' }),
    );
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: 9, type: 'REWARD_FULFILLED', refRewardId: 7 }),
    );
  });

  it('marca la meta ACHIEVED cuando el ledger acumulado alcanza targetPoints, y notifica a hijo y padre', async () => {
    const { uc, books, rewards, goals, ledger, notifications } = build();
    books.findByIdAny.mockResolvedValue(makeBook({ status: 'FINISHED' }));
    rewards.listPendingByBook.mockResolvedValue([makeReward({ value: 200, deadline: FUTURE })]);
    goals.findById.mockResolvedValue(makeGoal({ targetPoints: 300, status: 'ACTIVE' }));
    ledger.sumByGoal.mockResolvedValue(300); // ya alcanzó el objetivo tras este ledger entry

    await uc.execute(10);

    expect(goals.setStatus).toHaveBeenCalledWith(3, 'ACHIEVED');
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: 9, type: 'GOAL_ACHIEVED' }),
    );
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: 5, type: 'GOAL_ACHIEVED' }),
    );
  });

  it('NO marca ACHIEVED si el acumulado sigue por debajo de targetPoints', async () => {
    const { uc, books, rewards, goals, ledger } = build();
    books.findByIdAny.mockResolvedValue(makeBook({ status: 'FINISHED' }));
    rewards.listPendingByBook.mockResolvedValue([makeReward({ value: 100, deadline: FUTURE })]);
    goals.findById.mockResolvedValue(makeGoal({ targetPoints: 300, status: 'ACTIVE' }));
    ledger.sumByGoal.mockResolvedValue(100);

    await uc.execute(10);

    expect(goals.setStatus).not.toHaveBeenCalled();
  });

  it('recompensa MONEY no consulta metas', async () => {
    const { uc, books, rewards, goals, ledger } = build();
    books.findByIdAny.mockResolvedValue(makeBook({ status: 'FINISHED' }));
    rewards.listPendingByBook.mockResolvedValue([makeReward({ type: 'MONEY', goalId: null, deadline: FUTURE })]);

    await uc.execute(10);

    expect(goals.findById).not.toHaveBeenCalled();
    expect(ledger.create).toHaveBeenCalledWith(expect.objectContaining({ kind: 'MONEY' }));
  });

  it('marca PENALIZED (no FULFILLED) si el libro se terminó DESPUÉS del deadline', async () => {
    const { uc, books, rewards, ledger, notifications } = build();
    books.findByIdAny.mockResolvedValue(makeBook({ status: 'FINISHED' }));
    rewards.listPendingByBook.mockResolvedValue([makeReward({ deadline: PAST, penaltyValue: 50 })]);

    await uc.execute(10);

    expect(rewards.resolve).toHaveBeenCalledWith(7, 'PENALIZED', expect.any(Date));
    expect(ledger.create).toHaveBeenCalledWith(expect.objectContaining({ reason: 'PENALTY', amount: -50 }));
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: 9, type: 'REWARD_PENALIZED' }),
    );
  });

  it('libro inexistente → no-op (sin lanzar)', async () => {
    const { uc, books, rewards } = build();
    books.findByIdAny.mockResolvedValue(null);
    await uc.execute(999);
    expect(rewards.listPendingByBook).not.toHaveBeenCalled();
  });

  it('sin recompensas pendientes → no-op', async () => {
    const { uc, books, rewards } = build();
    books.findByIdAny.mockResolvedValue(makeBook({ status: 'FINISHED' }));
    rewards.listPendingByBook.mockResolvedValue([]);
    await uc.execute(10);
    expect(rewards.resolve).not.toHaveBeenCalled();
  });
});

describe('PenalizeOverdueRewardsUseCase', () => {
  function build() {
    const rewards = rewardsMock();
    const books = booksMock();
    const goals = goalsMock();
    const ledger = ledgerMock();
    const notifications = notificationsMock();
    const uc = new PenalizeOverdueRewardsUseCase(
      rewards as unknown as RewardRepository,
      books as unknown as BookRepository,
      goals as unknown as GoalRepository,
      ledger as unknown as LedgerRepository,
      notifications as unknown as NotificationRepository,
    );
    return { uc, rewards, books, goals, ledger, notifications };
  }

  it('penaliza recompensas vencidas con penaltyValue (libro no terminado)', async () => {
    const { uc, rewards, books, ledger } = build();
    rewards.listAllPending.mockResolvedValue([makeReward({ id: 1, bookId: 10, deadline: PAST, penaltyValue: 50 })]);
    books.findByIdAny.mockResolvedValue(makeBook({ status: 'READING' }));

    const result = await uc.execute();

    expect(rewards.resolve).toHaveBeenCalledWith(1, 'PENALIZED', expect.any(Date));
    expect(ledger.create).toHaveBeenCalledWith(expect.objectContaining({ reason: 'PENALTY', amount: -50 }));
    expect(result).toEqual({ fulfilled: 0, penalized: 1 });
  });

  it('vencida SIN penaltyValue: se marca PENALIZED pero sin LedgerEntry', async () => {
    const { uc, rewards, books, ledger } = build();
    rewards.listAllPending.mockResolvedValue([makeReward({ id: 2, deadline: PAST, penaltyValue: null })]);
    books.findByIdAny.mockResolvedValue(makeBook({ status: 'NOT_STARTED' }));

    await uc.execute();

    expect(rewards.resolve).toHaveBeenCalledWith(2, 'PENALIZED', expect.any(Date));
    expect(ledger.create).not.toHaveBeenCalled();
  });

  it('no toca recompensas todavía dentro de plazo', async () => {
    const { uc, rewards, books } = build();
    rewards.listAllPending.mockResolvedValue([makeReward({ deadline: FUTURE })]);
    books.findByIdAny.mockResolvedValue(makeBook({ status: 'NOT_STARTED' }));

    const result = await uc.execute();

    expect(rewards.resolve).not.toHaveBeenCalled();
    expect(result).toEqual({ fulfilled: 0, penalized: 0 });
  });

  it('cuenta como FULFILLED (red de seguridad) si el libro ya está FINISHED a tiempo', async () => {
    const { uc, rewards, books, ledger } = build();
    rewards.listAllPending.mockResolvedValue([makeReward({ deadline: FUTURE, type: 'MONEY', goalId: null })]);
    books.findByIdAny.mockResolvedValue(makeBook({ status: 'FINISHED' }));

    const result = await uc.execute();

    expect(result).toEqual({ fulfilled: 1, penalized: 0 });
    expect(ledger.create).toHaveBeenCalledWith(expect.objectContaining({ reason: 'FULFILLED' }));
  });

  it('ignora recompensas huérfanas (libro no encontrado)', async () => {
    const { uc, rewards, books } = build();
    rewards.listAllPending.mockResolvedValue([makeReward({ deadline: PAST })]);
    books.findByIdAny.mockResolvedValue(null);

    const result = await uc.execute();
    expect(result).toEqual({ fulfilled: 0, penalized: 0 });
  });
});

describe('RedeemGoalUseCase', () => {
  function build() {
    const goals = goalsMock();
    const ledger = ledgerMock();
    const users = usersMock();
    const uc = new RedeemGoalUseCase(
      goals as unknown as GoalRepository,
      ledger as unknown as LedgerRepository,
      users as unknown as UserRepository,
    );
    return { uc, goals, ledger, users };
  }

  it('canjea una meta ACHIEVED: crea LedgerEntry REDEMPTION negativa y pasa a REDEEMED', async () => {
    const { uc, goals, ledger, users } = build();
    goals.findById.mockResolvedValue(makeGoal({ status: 'ACHIEVED', targetPoints: 300 }));
    users.findById.mockResolvedValue(MY_CHILD);
    goals.setStatus.mockResolvedValue(makeGoal({ status: 'REDEEMED' }));

    const result = await uc.execute(PARENT, 3);

    expect(ledger.create).toHaveBeenCalledWith(
      expect.objectContaining({ childId: 9, kind: 'POINTS', amount: -300, reason: 'REDEMPTION', goalId: 3 }),
    );
    expect(goals.setStatus).toHaveBeenCalledWith(3, 'REDEEMED');
    expect(result.status).toBe('REDEEMED');
  });

  it('rechaza canjear una meta que no está ACHIEVED (ConflictError)', async () => {
    const { uc, goals, users } = build();
    goals.findById.mockResolvedValue(makeGoal({ status: 'ACTIVE' }));
    users.findById.mockResolvedValue(MY_CHILD);
    await expect(uc.execute(PARENT, 3)).rejects.toThrow(ConflictError);
  });

  it('meta inexistente → DomainNotFound', async () => {
    const { uc, goals } = build();
    goals.findById.mockResolvedValue(null);
    await expect(uc.execute(PARENT, 999)).rejects.toThrow(DomainNotFound);
  });

  it('rechaza canjear la meta de un hijo ajeno', async () => {
    const { uc, goals, users } = build();
    goals.findById.mockResolvedValue(makeGoal({ status: 'ACHIEVED' }));
    users.findById.mockResolvedValue(MY_CHILD); // parentId=5, actor=77
    await expect(uc.execute(OTHER_PARENT, 3)).rejects.toThrow(OwnershipError);
  });
});

describe('GetMyBalanceUseCase', () => {
  it('suma puntos y euros del propio actor', async () => {
    const ledger = ledgerMock();
    ledger.sumByChild.mockImplementation((_id: number, kind: string) => Promise.resolve(kind === 'POINTS' ? 250 : 12.5));
    const uc = new GetMyBalanceUseCase(ledger as unknown as LedgerRepository);

    const balance = await uc.execute({ id: 9, role: 'CHILD', parentId: 5 });
    expect(balance).toEqual({ points: 250, money: 12.5 });
  });
});

describe('GetChildLedgerUseCase', () => {
  it('devuelve saldo + movimientos de un hijo propio', async () => {
    const ledger = ledgerMock();
    const users = usersMock();
    users.findById.mockResolvedValue(MY_CHILD);
    ledger.sumByChild.mockImplementation((_id: number, kind: string) => Promise.resolve(kind === 'POINTS' ? 300 : 0));
    ledger.listByChild.mockResolvedValue([]);
    const uc = new GetChildLedgerUseCase(ledger as unknown as LedgerRepository, users as unknown as UserRepository);

    const result = await uc.execute(PARENT, 9);
    expect(result.balance).toEqual({ points: 300, money: 0 });
  });

  it('rechaza consultar el ledger de un hijo ajeno', async () => {
    const ledger = ledgerMock();
    const users = usersMock();
    users.findById.mockResolvedValue(MY_CHILD);
    const uc = new GetChildLedgerUseCase(ledger as unknown as LedgerRepository, users as unknown as UserRepository);
    await expect(uc.execute(OTHER_PARENT, 9)).rejects.toThrow(OwnershipError);
  });
});

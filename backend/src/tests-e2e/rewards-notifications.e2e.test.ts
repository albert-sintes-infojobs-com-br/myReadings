import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

/**
 * Tests E2E reales (Fase 13): levantan el servidor COMPILADO (`dist/main.js`) contra la
 * base de datos de desarrollo y ejercen los flujos de negocio vía HTTP puro (fetch), tal
 * como hacen los scripts smoke-*.ps1, pero de forma automatizada y con aserciones.
 *
 * Por qué así y no con `Test.createTestingModule` + supertest en proceso: este proyecto
 * compila con esbuild en Vitest, que NO emite `design:paramtypes` (ver memoria de
 * arquitectura) — Nest no podría resolver los controllers/servicios reales in-process.
 * Arrancar el `dist/` ya compilado por `tsc`/`nest build` evita el problema por completo.
 *
 * Usa un padre/hijo nuevos con email único (timestamp) para no tocar el seed baseline;
 * limpieza total al final borrando el usuario padre (cascade en el schema).
 */

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}/api`;
const prisma = new PrismaClient();

let serverProcess: ChildProcess;
let parentId: number | undefined;

interface ApiResult<T = any> {
  status: number;
  body: T;
}

async function api<T = any>(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: (text ? JSON.parse(text) : undefined) as T };
}

async function waitForHealth(maxAttempts = 40): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) return;
    } catch {
      // el servidor aún no acepta conexiones: se reintenta.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('El servidor E2E no respondió a /api/health a tiempo');
}

beforeAll(async () => {
  serverProcess = spawn('node', ['dist/main.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe',
  });
  await waitForHealth();
});

afterAll(async () => {
  if (parentId) {
    await prisma.user.delete({ where: { id: parentId } }).catch(() => undefined);
  }
  await prisma.$disconnect();
  serverProcess?.kill();
});

describe('E2E — flujo de recompensas y notificaciones', () => {
  const stamp = Date.now();
  const parentEmail = `e2e-parent-${stamp}@test.dev`;
  const childEmail = `e2e-child-${stamp}@test.dev`;
  const password = 'password123';

  let parentToken: string;
  let childToken: string;
  let childId: number;
  let bookId: number;
  let goalId: number;
  let rewardId: number;
  let rewardRequestId: number;

  it('registra un padre, crea un hijo y ambos pueden iniciar sesión', async () => {
    const register = await api('/auth/register', {
      method: 'POST',
      body: { name: 'E2E Padre', email: parentEmail, password },
    });
    expect(register.status).toBe(201);
    parentId = register.body.id;

    const parentLogin = await api('/auth/login', {
      method: 'POST',
      body: { email: parentEmail, password },
    });
    expect(parentLogin.status).toBe(200);
    parentToken = parentLogin.body.accessToken;

    const child = await api('/users/children', {
      method: 'POST',
      token: parentToken,
      body: { name: 'E2E Hijo', email: childEmail, password },
    });
    expect(child.status).toBe(201);
    childId = child.body.id;

    const childLogin = await api('/auth/login', {
      method: 'POST',
      body: { email: childEmail, password },
    });
    expect(childLogin.status).toBe(200);
    childToken = childLogin.body.accessToken;
  });

  it('el hijo crea un libro NOT_STARTED y solicita recompensa → RewardRequest + Notification al padre', async () => {
    const book = await api('/books', {
      method: 'POST',
      token: childToken,
      body: { title: 'Libro E2E', author: 'Autor E2E' },
    });
    expect(book.status).toBe(201);
    expect(book.body.status).toBe('NOT_STARTED');
    bookId = book.body.id;

    const requestReward = await api(`/books/${bookId}/request-reward`, {
      method: 'POST',
      token: childToken,
    });
    expect(requestReward.status).toBe(201);
    expect(requestReward.body.status).toBe('PENDING');

    const pending = await api('/reward-requests', { token: parentToken });
    expect(pending.status).toBe(200);
    const found = pending.body.find((r: any) => r.bookId === bookId);
    expect(found).toBeDefined();
    rewardRequestId = found.id;

    const notifications = await api('/notifications', { token: parentToken });
    expect(
      notifications.body.some((n: any) => n.type === 'REWARD_REQUEST' && n.refBookId === bookId),
    ).toBe(true);
  });

  it('rechaza crear una recompensa POINTS sin goalId (400) y valida deadline futura', async () => {
    const noGoal = await api(`/books/${bookId}/rewards`, {
      method: 'POST',
      token: parentToken,
      body: { type: 'POINTS', value: 100, deadline: '2099-01-01' },
    });
    expect(noGoal.status).toBe(400);

    const pastDeadline = await api(`/books/${bookId}/rewards`, {
      method: 'POST',
      token: parentToken,
      body: { type: 'MONEY', value: 5, deadline: '2000-01-01' },
    });
    expect(pastDeadline.status).toBe(400);
  });

  it('el hijo no puede crear recompensas (403)', async () => {
    const forbidden = await api(`/books/${bookId}/rewards`, {
      method: 'POST',
      token: childToken,
      body: { type: 'MONEY', value: 5, deadline: '2099-01-01' },
    });
    expect(forbidden.status).toBe(403);
  });

  it('el padre crea una meta y una recompensa de puntos enlazada, y resuelve la solicitud', async () => {
    const goal = await api(`/children/${childId}/goals`, {
      method: 'POST',
      token: parentToken,
      body: { name: 'Meta E2E', targetPoints: 100 },
    });
    expect(goal.status).toBe(201);
    goalId = goal.body.id;

    const reward = await api(`/books/${bookId}/rewards`, {
      method: 'POST',
      token: parentToken,
      body: { type: 'POINTS', value: 100, deadline: '2099-01-01', goalId },
    });
    expect(reward.status).toBe(201);
    expect(reward.body.status).toBe('PENDING');
    rewardId = reward.body.id;

    const resolved = await api(`/reward-requests/${rewardRequestId}`, {
      method: 'PATCH',
      token: parentToken,
      body: { status: 'RESOLVED' },
    });
    expect(resolved.status).toBe(200);
    expect(resolved.body.status).toBe('RESOLVED');
  });

  it('rechaza crear otra recompensa sobre el mismo libro si ya no está NOT_STARTED (409) — comprobado tras marcarlo READING', async () => {
    const toReading = await api(`/books/${bookId}`, {
      method: 'PATCH',
      token: childToken,
      body: { status: 'READING' },
    });
    expect(toReading.status).toBe(200);

    const secondReward = await api(`/books/${bookId}/rewards`, {
      method: 'POST',
      token: parentToken,
      body: { type: 'MONEY', value: 5, deadline: '2099-01-01' },
    });
    expect(secondReward.status).toBe(409);
  });

  it('el hijo termina el libro dentro del plazo → FULFILLED + ledger positivo + meta ACHIEVED + notificaciones', async () => {
    const finish = await api(`/books/${bookId}`, {
      method: 'PATCH',
      token: childToken,
      body: { status: 'FINISHED' },
    });
    expect(finish.status).toBe(200);
    expect(finish.body.status).toBe('FINISHED');

    const reward = await api(`/rewards/${rewardId}`, { token: parentToken });
    expect(reward.body.status).toBe('FULFILLED');

    const ledger = await api(`/children/${childId}/ledger`, { token: parentToken });
    expect(ledger.body.balance.points).toBe(100);
    expect(
      ledger.body.entries.some((e: any) => e.reason === 'FULFILLED' && e.amount === 100),
    ).toBe(true);

    const goals = await api(`/children/${childId}/goals`, { token: parentToken });
    const goal = goals.body.find((g: any) => g.id === goalId);
    expect(goal.status).toBe('ACHIEVED');

    const childNotifications = await api('/notifications', { token: childToken });
    expect(
      childNotifications.body.some(
        (n: any) => n.type === 'REWARD_FULFILLED' && n.refRewardId === rewardId,
      ),
    ).toBe(true);
    expect(childNotifications.body.some((n: any) => n.type === 'GOAL_ACHIEVED')).toBe(true);
  });

  it('el padre canjea la meta conseguida → REDEEMED + ledger REDEMPTION + saldo de puntos vuelve a 0', async () => {
    const redeem = await api(`/goals/${goalId}/redeem`, {
      method: 'POST',
      token: parentToken,
    });
    expect(redeem.status).toBe(200);
    expect(redeem.body.status).toBe('REDEEMED');

    const balance = await api('/ledger/balance', { token: childToken });
    expect(balance.body.points).toBe(0);
  });

  it('penaliza una recompensa cuyo plazo ya venció al terminar el libro → PENALIZED + ledger negativo + notificación', async () => {
    const book2 = await api('/books', {
      method: 'POST',
      token: childToken,
      body: { title: 'Libro E2E Penalizado', author: 'Autor E2E' },
    });
    expect(book2.status).toBe(201);
    const book2Id = book2.body.id;

    const reward2 = await api(`/books/${book2Id}/rewards`, {
      method: 'POST',
      token: parentToken,
      body: { type: 'MONEY', value: 5, penaltyValue: 2, deadline: '2099-01-01' },
    });
    expect(reward2.status).toBe(201);
    const reward2Id = reward2.body.id;

    // No existe endpoint para forzar el vencimiento: se backdatea el deadline directamente
    // en BD (única vía) para poder probar la rama PENALIZED sin esperar al cron diario.
    await prisma.reward.update({
      where: { id: reward2Id },
      data: { deadline: new Date('2020-01-01') },
    });

    const finish = await api(`/books/${book2Id}`, {
      method: 'PATCH',
      token: childToken,
      body: { status: 'FINISHED' },
    });
    expect(finish.status).toBe(200);

    const rewardCheck = await api(`/rewards/${reward2Id}`, { token: parentToken });
    expect(rewardCheck.body.status).toBe('PENALIZED');

    const balance = await api('/ledger/balance', { token: childToken });
    expect(balance.body.money).toBe(-2);

    const notifications = await api('/notifications', { token: childToken });
    expect(
      notifications.body.some(
        (n: any) => n.type === 'REWARD_PENALIZED' && n.refRewardId === reward2Id,
      ),
    ).toBe(true);
  });

  it('descarta una solicitud de recompensa → DISMISSED', async () => {
    const book3 = await api('/books', {
      method: 'POST',
      token: childToken,
      body: { title: 'Libro E2E Descartado', author: 'Autor E2E' },
    });
    const book3Id = book3.body.id;

    const request = await api(`/books/${book3Id}/request-reward`, {
      method: 'POST',
      token: childToken,
    });
    expect(request.status).toBe(201);

    const pending = await api('/reward-requests', { token: parentToken });
    const found = pending.body.find((r: any) => r.bookId === book3Id);
    expect(found).toBeDefined();

    const dismissed = await api(`/reward-requests/${found.id}`, {
      method: 'PATCH',
      token: parentToken,
      body: { status: 'DISMISSED' },
    });
    expect(dismissed.status).toBe(200);
    expect(dismissed.body.status).toBe('DISMISSED');
  });

  it('aísla por rol: el hijo no puede ver /stats/overview (403) y el padre no puede ver /stats/me (403)', async () => {
    const overviewAsChild = await api('/stats/overview', { token: childToken });
    expect(overviewAsChild.status).toBe(403);

    const meAsParent = await api('/stats/me', { token: parentToken });
    expect(meAsParent.status).toBe(403);
  });

  it('rechaza el acceso sin token (401)', async () => {
    const noAuth = await api('/books');
    expect(noAuth.status).toBe(401);
  });
});

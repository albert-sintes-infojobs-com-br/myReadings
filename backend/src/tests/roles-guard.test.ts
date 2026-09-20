import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { Roles } from '../transport/auth/decorators/roles.decorator';
import { RolesGuard } from '../transport/auth/guards/roles.guard';

/** Crea un ExecutionContext falso con el request que lleva un `user` JWT. */
function fakeExecutionContextWithUser(
  user: { id: number; role: Role } | undefined,
): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getArgs: () => [],
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  // Handler de ejemplo con roles exigidos (el metadata lo fija @Roles
  // vía SetMetadata a runtime, compatible con esbuild).
  class StubController {
    @Roles([Role.PARENT])
    onlyParent() {}

    @Roles([Role.CHILD])
    onlyChild() {}

    open() {} // sin @Roles
  }

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('permite al PARENT una ruta protegida solo-PARENT', () => {
    const ctx = fakeExecutionContextWithUser({ id: 1, role: Role.PARENT });
    vi.spyOn(ctx as unknown as { getHandler: () => unknown }, 'getHandler').mockReturnValue(
      StubController.prototype.onlyParent,
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('niega (false) al CHILD una ruta protegida solo-PARENT', () => {
    const ctx = fakeExecutionContextWithUser({ id: 2, role: Role.CHILD });
    vi.spyOn(ctx as unknown as { getHandler: () => unknown }, 'getHandler').mockReturnValue(
      StubController.prototype.onlyParent,
    );
    expect(guard.canActivate(ctx)).toBe(false);
  });

  it('permite al CHILD una ruta protegida solo-CHILD (p. ej. enviar solicitud)', () => {
    const ctx = fakeExecutionContextWithUser({ id: 2, role: Role.CHILD });
    vi.spyOn(ctx as unknown as { getHandler: () => unknown }, 'getHandler').mockReturnValue(
      StubController.prototype.onlyChild,
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('permite a cualquiera (con auth) si la ruta NO pide rol específico', () => {
    const ctx = fakeExecutionContextWithUser({ id: 3, role: Role.CHILD });
    vi.spyOn(ctx as unknown as { getHandler: () => unknown }, 'getHandler').mockReturnValue(
      StubController.prototype.open,
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('niega si no hay user en la request (sin token)', () => {
    const ctx = fakeExecutionContextWithUser(undefined);
    vi.spyOn(ctx as unknown as { getHandler: () => unknown }, 'getHandler').mockReturnValue(
      StubController.prototype.onlyParent,
    );
    expect(guard.canActivate(ctx)).toBe(false);
  });
});

import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Segundo guard de la cadena de auth: verifica que el usuario autenticado
 * (request.user vía JwtAuthGuard) tenga alguno de los roles declarados
 * con `@Roles(...)`.
 *
 * - Si no hay metadata `@Roles`, se permite (la autenticación ya la hace
 *   otro guard — este solo restringe roles).
 * - Si `request.user` no está presente, se deniega (401/403 vía JwtAuthGuard
 *   antes, pero defendemos la invariante por seguridad).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles: Role[] | undefined = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      // Sin restricción de rol: autenticación ya garantizada por otro guard.
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      return false;
    }
    return requiredRoles.includes(user.role);
  }
}

import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

/** Metadata key compartido entre el decorator @Roles y el RolesGuard. */
export const ROLES_KEY = 'roles';

/**
 * Restringe el acceso al handler/clase a los roles indicados.
 * Requiere que también esté activo el JwtAuthGuard (o equivalente) para
 * que `request.user` esté poblado antes de que el RolesGuard se invoque.
 *
 * @example
 * @Controller('users')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(Role.PARENT)
 */
export const Roles = (roles: Role[]) => SetMetadata(ROLES_KEY, roles);

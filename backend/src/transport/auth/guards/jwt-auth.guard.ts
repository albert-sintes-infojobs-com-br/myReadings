import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard de autenticación JWT. Se usa ANTES de RolesGuard para que
 * `request.user` esté disponible cuando el guard de roles se invoque.
 *
 * @example
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(Role.PARENT)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

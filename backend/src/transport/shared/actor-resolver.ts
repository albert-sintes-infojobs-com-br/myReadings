import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ActorView } from '../../domain/shared/actor';

/**
 * Resuelve el ActorView del dominio a partir del `request.user` de JWT.
 *
 * El token trae `id`, `role`, `email` pero NO `parentId`, y ese último es
 * lo que algunos dominios necesitan (p. ej. la vista hijo→padre de
 * categorías). Se hace una única query ligera (findFirst con select
 * mínimo) por request. Compartido por todos los módulos de transporte.
 */
@Injectable()
export class ActorResolver {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @param user `request.user` provisto por JwtStrategy (`{id, role, email}`).
   */
  resolve(user: { id: number; role: string }): Promise<ActorView> {
    return this.prisma.user
      .findFirst({
        where: { id: user.id },
        select: { id: true, role: true, parentId: true },
      })
      .then((row) => {
        if (!row) {
          // El token vivía pero el usuario fue borrado. El dominio no puede
          // operarlo; se levanta un Error genérico aquí (500) — en la
          // práctica el TTL corto del JWT hace esto un caso casi nulo.
          throw new Error('Usuario autenticado no existe en la base de datos');
        }
        return {
          id: row.id,
          role: row.role as ActorView['role'],
          parentId: row.parentId,
        };
      });
  }
}

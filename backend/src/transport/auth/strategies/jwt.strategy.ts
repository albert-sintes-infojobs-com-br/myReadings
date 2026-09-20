import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: number;
  role: 'PARENT' | 'CHILD';
  email: string;
}

/**
 * Estrategía JWT de passport: valida la firma y rellena `request.user`
 * con el payload del token (sub, role, email).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'dev-secret-cambiar'),
    });
  }

  async validate(payload: JwtPayload) {
    // `sub` es el id de usuario. No se hace query a la BD aquí para
    // mantener el guard rápido; la consistencia de datos (borrado de
    // usuario con token viviente) se resuelve con TTL corto + refresh.
    return { id: payload.sub, role: payload.role, email: payload.email };
  }
}

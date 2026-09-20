import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Catch } from '@nestjs/common';
import {
  AuthenticationError,
  ConflictError,
  DomainNotFound,
  DomainValidation,
  OwnershipError,
} from '../../domain/shared/domain-errors';

/**
 * Traduce los errores tipados del dominio (src/domain) a HTTP:
 *  - DomainNotFound   → 404
 *  - OwnershipError   → 403
 *  - ConflictError    → 409
 *  - DomainValidation → 400
 *  - resto            → 500 (mismo shape JSON que el filtro por defecto
 *    de Nest: { statusCode, message, error? })
 *
 * Se registra por módulo de transporte (`@UseFilters` en el módulo) para
 * no alterar el comportamiento global de la app.
 */
@Injectable()
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = this.toHttpException(exception);
    // `any`: ExpressResponse tiene status()/json() encadenables (este filtro
    // solo corre sobre la app web; no se usa en contextos no-HTTP).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = host.switchToHttp().getResponse<any>();

    const status =
      http instanceof HttpException ? http.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      http instanceof HttpException ? http.getResponse() : 'Error interno';

    const body =
      typeof message === 'string'
        ? { statusCode: status, message }
        : message as Record<string, unknown>;
    response.status(status).json(body);
  }

  private toHttpException(exception: unknown): HttpException {
    if (exception instanceof HttpException) return exception;
    if (exception instanceof DomainNotFound) return new NotFoundException(exception.message);
    if (exception instanceof OwnershipError) return new ForbiddenException(exception.message);
    if (exception instanceof ConflictError) return new ConflictException(exception.message);
    if (exception instanceof DomainValidation) return new BadRequestException(exception.message);
    if (exception instanceof AuthenticationError) return new UnauthorizedException(exception.message);
    return new HttpException(
      exception instanceof Error ? exception.message : 'Error interno',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

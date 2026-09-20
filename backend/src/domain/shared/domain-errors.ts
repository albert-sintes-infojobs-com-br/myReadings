/**
 * Errores de excepción del dominio.
 *
 * El dominio (src/domain) no conoce a NestJS, Express ni frameworks HTTP:
 * lanza estos errores tipados y la capa de transporte (src/transport) los
 * traduce a respuestas HTTP (404, 409, 403…). Los tests del dominio
 * asumen `reject.toThrow(DomainNotFound)` y similares, sin HTTP.
 */

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
  }
}

/** La entidad buscada no existe. → 404 Not Found */
export class DomainNotFound extends DomainError {
  constructor(message = 'Recurso no encontrado', public readonly resource: string = '') {
    super(message);
  }
}

/** Entrada que viola una regla de negocio (p. ej. colorHex inválido). → 400 Bad Request */
export class DomainValidation extends DomainError {}

/** El usuario no es propietario del recurso. → 403 Forbidden */
export class OwnershipError extends DomainError {}

/** Conflicto de estado/índice (p. ej. eliminar categoría con libros). → 409 Conflict */
export class ConflictError extends DomainError {}

/** Credenciales inválidas al hacer login. → 401 Unauthorized */
export class AuthenticationError extends DomainError {}

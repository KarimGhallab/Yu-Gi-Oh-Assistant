import { HttpStatus } from './types.js';

/**
 * Base class for errors raised deliberately by a layer of the application. The
 * status code is the HTTP status the transport boundary should use when it maps
 * the error to a response.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly statusCode: HttpStatus
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * A request or input that does not satisfy the domain rules.
 */
export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, HttpStatus.BadRequest);
  }
}

/**
 * A requested resource that does not exist.
 */
export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message, HttpStatus.NotFound);
  }
}

/**
 * A dependency that is temporarily unavailable.
 */
export class UnavailableError extends DomainError {
  constructor(message: string) {
    super(message, HttpStatus.ServiceUnavailable);
  }
}

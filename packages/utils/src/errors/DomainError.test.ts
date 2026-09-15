import { describe, expect, it } from 'vitest';

import {
  DomainError,
  NotFoundError,
  UnavailableError,
  ValidationError
} from './DomainError.js';
import { HttpStatus } from './types.js';

describe('DomainError', () => {
  it('carries a message and an HTTP status', () => {
    const error = new DomainError('boom', HttpStatus.InternalServerError);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('boom');
    expect(error.statusCode).toBe(500);
  });

  it('names each error after its own class', () => {
    expect(new DomainError('boom', HttpStatus.InternalServerError).name).toBe(
      'DomainError'
    );
    expect(new ValidationError('bad input').name).toBe('ValidationError');
    expect(new NotFoundError('missing').name).toBe('NotFoundError');
    expect(new UnavailableError('down').name).toBe('UnavailableError');
  });

  it('maps each concrete error to its HTTP status', () => {
    expect(new ValidationError('bad input').statusCode).toBe(400);
    expect(new NotFoundError('missing').statusCode).toBe(404);
    expect(new UnavailableError('down').statusCode).toBe(503);
  });

  it('stays distinguishable by instanceof', () => {
    const error: unknown = new NotFoundError('missing');

    expect(error instanceof DomainError).toBe(true);
    expect(error instanceof NotFoundError).toBe(true);
    expect(error instanceof ValidationError).toBe(false);
  });
});

import pino from 'pino';

import { type ILogger, type LogContext, type LoggerOptions } from './types.js';

class PinoLogger implements ILogger {
  constructor(private readonly _logger: pino.Logger) {}

  debug(message: string, context?: LogContext): void {
    this._logger.debug(context ?? {}, message);
  }

  info(message: string, context?: LogContext): void {
    this._logger.info(context ?? {}, message);
  }

  warn(message: string, context?: LogContext): void {
    this._logger.warn(context ?? {}, message);
  }

  error(message: string, context?: LogContext): void {
    this._logger.error(context ?? {}, message);
  }
}

/**
 * Creates the application logger. Callers depend on the returned interface and
 * never on the logging library underneath.
 */
export function createLogger(options: LoggerOptions): ILogger {
  const logger = pino(
    { level: options.level, name: options.name },
    options.destination
  );
  return new PinoLogger(logger);
}

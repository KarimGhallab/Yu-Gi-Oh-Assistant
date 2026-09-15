import pino from 'pino';
import pinoPretty from 'pino-pretty';
import { createStream } from 'rotating-file-stream';

import {
  type FileLoggingOptions,
  type ILogger,
  type LogContext,
  type LogDestination,
  type LoggerOptions
} from './types.js';

const DEFAULT_MAX_SIZE = '10M';
const DEFAULT_MAX_FILES = 5;

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
    resolveDestination(options)
  );
  return new PinoLogger(logger);
}

/**
 * Picks the log sink. An injected destination wins, then a rotating file
 * (mirrored to stdout), then a colorized terminal stream, then plain JSON on
 * stdout when nothing is configured.
 */
function resolveDestination(
  options: LoggerOptions
): LogDestination | undefined {
  if (options.destination !== undefined) {
    return options.destination;
  }
  if (options.file !== undefined) {
    return createFileStream(options.file);
  }
  if (options.pretty === true) {
    return createPrettyStream();
  }
  return undefined;
}

function createPrettyStream(): LogDestination {
  return pinoPretty({
    colorize: process.stdout.isTTY === true,
    translateTime: 'SYS:HH:MM:ss',
    ignore: 'pid,hostname'
  });
}

function createFileStream(file: FileLoggingOptions): LogDestination {
  return createStream(`${file.fileName}.log`, {
    path: file.directory,
    size: file.size ?? DEFAULT_MAX_SIZE,
    maxFiles: file.maxFiles ?? DEFAULT_MAX_FILES,
    teeToStdout: true
  });
}

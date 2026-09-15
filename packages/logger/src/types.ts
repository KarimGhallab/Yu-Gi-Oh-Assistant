/**
 * Levels a logger can be configured with, from most to least verbose.
 */
export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error'
}

/**
 * Structured fields attached to a log record.
 */
export type LogContext = Record<string, unknown>;

/**
 * Sink the logger writes serialised records to.
 */
export interface LogDestination {
  write(message: string): void;
}

/**
 * Options for creating a logger.
 */
export interface LoggerOptions {
  level: LogLevel;
  name?: string;
  destination?: LogDestination;
}

/**
 * The logging surface the rest of the code depends on. Implementations hide
 * the underlying logging library so that callers never import it directly.
 */
export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

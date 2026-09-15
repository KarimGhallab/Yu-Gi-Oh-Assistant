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
 * Rotating file output. Log records are mirrored to stdout as well, so a
 * container still surfaces them.
 */
export interface FileLoggingOptions {
  directory: string;
  fileName: string;
  /** Rotate once a file reaches this size. */
  size?: string;
  /** How many rotated files to keep. */
  maxFiles?: number;
}

/**
 * Options for creating a logger.
 */
export interface LoggerOptions {
  level: LogLevel;
  name?: string;
  pretty?: boolean;
  file?: FileLoggingOptions;
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

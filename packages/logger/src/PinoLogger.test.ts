import { describe, expect, it } from 'vitest';

import { createLogger } from './PinoLogger.js';
import { LogLevel } from './types.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

class CapturingDestination {
  public readonly records: Record<string, unknown>[] = [];

  write(message: string): void {
    const value: unknown = JSON.parse(message);
    if (!isRecord(value)) {
      throw new Error(`Expected a structured log record, got: ${message}`);
    }
    this.records.push(value);
  }
}

const messages = (destination: CapturingDestination): unknown[] =>
  destination.records.map(record => record.msg);

describe('createLogger', () => {
  it('emits a structured record with the message and the context', () => {
    const destination = new CapturingDestination();
    const logger = createLogger({ level: LogLevel.Info, destination });

    logger.info('found cards', { count: 3 });

    expect(destination.records).toHaveLength(1);
    expect(destination.records[0].msg).toBe('found cards');
    expect(destination.records[0].count).toBe(3);
  });

  it('tags records with the logger name when provided', () => {
    const destination = new CapturingDestination();
    const logger = createLogger({
      level: LogLevel.Info,
      name: 'assistant',
      destination
    });

    logger.info('hello');

    expect(destination.records[0].name).toBe('assistant');
  });

  it('drops records below the configured level', () => {
    const destination = new CapturingDestination();
    const logger = createLogger({ level: LogLevel.Info, destination });

    logger.debug('dropped');
    logger.info('kept');

    expect(messages(destination)).toEqual(['kept']);
  });

  it('keeps records at or above the configured level', () => {
    const destination = new CapturingDestination();
    const logger = createLogger({ level: LogLevel.Warn, destination });

    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');

    expect(messages(destination)).toEqual(['warn', 'error']);
  });

  it('lets an injected destination take precedence over the pretty sink', () => {
    const destination = new CapturingDestination();
    const logger = createLogger({
      level: LogLevel.Info,
      pretty: true,
      destination
    });

    logger.info('kept structured');

    expect(destination.records[0].msg).toBe('kept structured');
  });

  it('lets an injected destination take precedence over the file sink', () => {
    const destination = new CapturingDestination();
    const logger = createLogger({
      level: LogLevel.Info,
      file: { directory: '/tmp/should-not-be-written', fileName: 'test' },
      destination
    });

    logger.info('kept structured');

    expect(destination.records[0].msg).toBe('kept structured');
  });
});

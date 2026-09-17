import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { LogLevel } from '@ygo-assistant/logger';
import type { ILogger, LogContext } from '@ygo-assistant/logger';
import { NotFoundError } from '@ygo-assistant/utils';

import { requestLogger } from './requestLogger.js';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
}

class RecordingLogger implements ILogger {
  public readonly entries: LogEntry[] = [];

  debug(message: string, context?: LogContext): void {
    this.entries.push({ level: LogLevel.Debug, message, context });
  }

  info(message: string, context?: LogContext): void {
    this.entries.push({ level: LogLevel.Info, message, context });
  }

  warn(message: string, context?: LogContext): void {
    this.entries.push({ level: LogLevel.Warn, message, context });
  }

  error(message: string, context?: LogContext): void {
    this.entries.push({ level: LogLevel.Error, message, context });
  }
}

function buildApp(logger: ILogger): Hono {
  const app = new Hono();
  app.use('*', requestLogger(logger));
  app.get('/cards', context => context.json({ cards: [] }));
  app.get('/missing', context => context.json({ error: 'gone' }, 404));
  app.get('/broken', context => context.json({ error: 'boom' }, 500));
  app.get('/thrown', () => {
    throw new NotFoundError('gone');
  });
  app.onError((error, context) => {
    const status = error instanceof NotFoundError ? 404 : 500;
    return context.json({ error: error.message }, status);
  });
  return app;
}

describe('requestLogger', () => {
  it('records the method, path, status, and duration of a completed request', async () => {
    const logger = new RecordingLogger();
    const app = buildApp(logger);

    const response = await app.request('/cards');

    expect(response.status).toBe(200);
    expect(logger.entries).toHaveLength(1);
    const [entry] = logger.entries;
    expect(entry.level).toBe(LogLevel.Info);
    expect(entry.context).toMatchObject({
      method: 'GET',
      path: '/cards',
      status: 200
    });
    expect(entry.context?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('warns when the response is a client error', async () => {
    const logger = new RecordingLogger();
    const app = buildApp(logger);

    await app.request('/missing');

    expect(logger.entries).toHaveLength(1);
    expect(logger.entries[0].level).toBe(LogLevel.Warn);
  });

  it('errors when the response is a server error', async () => {
    const logger = new RecordingLogger();
    const app = buildApp(logger);

    await app.request('/broken');

    expect(logger.entries).toHaveLength(1);
    expect(logger.entries[0].level).toBe(LogLevel.Error);
  });

  it('records a request whose handler threw once the boundary has answered', async () => {
    const logger = new RecordingLogger();
    const app = buildApp(logger);

    const response = await app.request('/thrown');

    expect(response.status).toBe(404);
    expect(logger.entries).toHaveLength(1);
    expect(logger.entries[0].context).toMatchObject({
      method: 'GET',
      path: '/thrown',
      status: 404
    });
  });
});

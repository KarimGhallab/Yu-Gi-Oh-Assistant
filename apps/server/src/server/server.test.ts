import { describe, expect, it } from 'vitest';

import type { IAppStore } from '@ygo-assistant/db';
import { LogLevel } from '@ygo-assistant/logger';
import type { ILogger, LogContext } from '@ygo-assistant/logger';
import type { IOllamaClient } from '@ygo-assistant/ollama';
import { NotFoundError } from '@ygo-assistant/utils';

import { loadConfig } from '../config/index.js';
import { isLoopbackHost, logBinding } from './binding.js';
import { createServer } from './server.js';

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

const ollamaStub: IOllamaClient = {
  listModels: async () => [],
  embed: async () => [],
  chat: async function* () {}
};

const storeStub: IAppStore = {
  conversations: {
    create: async () => {
      throw new Error('These tests never store a conversation');
    },
    find: async () => undefined,
    list: async () => [],
    update: async () => {
      throw new Error('These tests never update a conversation');
    },
    delete: async () => {
      throw new Error('These tests never delete a conversation');
    }
  },
  messages: {
    append: async () => {
      throw new Error('These tests never store a message');
    },
    list: async () => []
  },
  close: async () => {}
};

const createDependencies = (env: Record<string, string | undefined> = {}) => ({
  config: loadConfig(env),
  logger: new RecordingLogger(),
  ollama: ollamaStub,
  store: storeStub
});

describe('createServer', () => {
  it('reports health', async () => {
    const app = createServer(createDependencies());

    const response = await app.request('/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('sends no CORS headers when no client origin is configured', async () => {
    const app = createServer(createDependencies());

    const response = await app.request('/health', {
      headers: { origin: 'http://localhost:5173' }
    });

    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('allows a separately hosted client origin when configured', async () => {
    const app = createServer(
      createDependencies({ CORS_ORIGIN: 'http://localhost:5173' })
    );

    const response = await app.request('/health', {
      headers: { origin: 'http://localhost:5173' }
    });

    expect(response.headers.get('access-control-allow-origin')).toBe(
      'http://localhost:5173'
    );
  });

  it('maps a domain error to its HTTP status and logs it', async () => {
    const dependencies = createDependencies();
    const app = createServer(dependencies);
    app.get('/typed-error', () => {
      throw new NotFoundError('missing card');
    });

    const response = await app.request('/typed-error');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'missing card' });
    expect(
      dependencies.logger.entries.some(entry => entry.level === LogLevel.Warn)
    ).toBe(true);
  });

  it('hides an unknown error behind a safe response but logs its detail', async () => {
    const dependencies = createDependencies();
    const app = createServer(dependencies);
    app.get('/unknown-error', () => {
      throw new Error('database exploded');
    });

    const response = await app.request('/unknown-error');

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal Server Error' });
    expect(JSON.stringify(dependencies.logger.entries)).toContain(
      'database exploded'
    );
  });
});

describe('binding', () => {
  it('recognises loopback hosts', () => {
    expect(isLoopbackHost('127.0.0.1')).toBe(true);
    expect(isLoopbackHost('localhost')).toBe(true);
    expect(isLoopbackHost('::1')).toBe(true);
    expect(isLoopbackHost('0.0.0.0')).toBe(false);
  });

  it('warns when bound to a non-loopback address', () => {
    const logger = new RecordingLogger();

    logBinding(logger, '0.0.0.0');

    expect(logger.entries[0].level).toBe(LogLevel.Warn);
    expect(logger.entries[0].context?.host).toBe('0.0.0.0');
  });

  it('stays at info level when bound to loopback', () => {
    const logger = new RecordingLogger();

    logBinding(logger, '127.0.0.1');

    expect(logger.entries[0].level).toBe(LogLevel.Info);
  });
});

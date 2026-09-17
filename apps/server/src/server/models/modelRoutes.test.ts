import { describe, expect, it } from 'vitest';

import { modelListSchema } from '@ygo-assistant/contracts';
import type { IAppStore } from '@ygo-assistant/db';
import type { ILogger } from '@ygo-assistant/logger';
import {
  type IOllamaClient,
  type OllamaModel,
  OllamaUnreachableError
} from '@ygo-assistant/ollama';
import { FakeOllamaClient } from '@ygo-assistant/test-support';

import { loadConfig } from '../../config/index.js';
import { createServer } from '../createServer.js';

const BASE_URL = 'http://127.0.0.1:11434';

/**
 * The two a chooser has to tell apart: a model that can answer a turn, and one
 * that reports no completion at all, the way an embedding model does.
 */
const CHAT_MODEL: OllamaModel = {
  name: 'llama3.1:8B',
  supportsCompletion: true,
  supportsStructuredOutput: true
};

const EMBEDDING_MODEL: OllamaModel = {
  name: 'nomic-embed-text:latest',
  supportsCompletion: false,
  supportsStructuredOutput: false
};

const silentLogger: ILogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
};

/**
 * The store has nothing to do with this route, so it refuses to be used rather
 * than pretending to be one.
 */
const unusedStore: IAppStore = {
  conversations: {
    create: async () => {
      throw new Error('Listing models never stores a conversation');
    },
    find: async () => undefined,
    list: async () => [],
    update: async () => {
      throw new Error('Listing models never updates a conversation');
    },
    delete: async () => {
      throw new Error('Listing models never deletes a conversation');
    }
  },
  messages: {
    append: async () => {
      throw new Error('Listing models never stores a message');
    },
    list: async () => [],
    setQuery: async () => {
      throw new Error('Listing models never stores a query');
    }
  },
  close: async () => {}
};

const app = (ollama: IOllamaClient) =>
  createServer({
    config: loadConfig({ OLLAMA_BASE_URL: BASE_URL }),
    logger: silentLogger,
    ollama,
    store: unusedStore
  });

describe('the model routes', () => {
  it('lists every model the instance reports, with what each can do', async () => {
    const client = new FakeOllamaClient({
      models: [CHAT_MODEL, EMBEDDING_MODEL]
    });

    const response = await app(client).request('/api/models');
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(modelListSchema.parse(body)).toEqual([CHAT_MODEL, EMBEDDING_MODEL]);
  });

  it('lists the models by name, in the order the instance reported or not', async () => {
    const client = new FakeOllamaClient({
      models: [EMBEDDING_MODEL, CHAT_MODEL]
    });

    const response = await app(client).request('/api/models');
    const body: unknown = await response.json();

    expect(modelListSchema.parse(body)).toEqual([CHAT_MODEL, EMBEDDING_MODEL]);
  });

  it('refuses a listing it cannot read because Ollama is unreachable', async () => {
    const client: IOllamaClient = {
      listModels: async () => {
        throw new OllamaUnreachableError(BASE_URL);
      },
      embed: async () => [],
      chat: () => {
        throw new Error('A listing that cannot be read never answers anything');
      }
    };

    const response = await app(client).request('/api/models');

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: expect.stringContaining(BASE_URL)
    });
  });
});

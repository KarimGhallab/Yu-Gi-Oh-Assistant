import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Language } from '@ygo-assistant/cards';
import {
  conversationListSchema,
  conversationSchema
} from '@ygo-assistant/contracts';
import { databasePath, openAppStore } from '@ygo-assistant/db';
import type { IAppStore } from '@ygo-assistant/db';
import type { ILogger } from '@ygo-assistant/logger';
import type { IOllamaClient } from '@ygo-assistant/ollama';

import { loadConfig } from '../config/index.js';
import { createServer } from './server.js';

const CHAT_MODEL = 'llama3.1:8b';

const silentLogger: ILogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
};

const ollamaStub: IOllamaClient = {
  listModels: async () => [],
  embed: async () => [],
  chat: async function* () {}
};

describe('conversation routes', () => {
  let dataDir: string;
  let store: IAppStore;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'ygo-assistant-api-'));
    store = await openAppStore(databasePath(dataDir));
  });

  afterEach(async () => {
    await store.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  const app = () =>
    createServer({
      config: loadConfig({ OLLAMA_CHAT_MODEL: CHAT_MODEL }),
      logger: silentLogger,
      ollama: ollamaStub,
      store
    });

  const postConversation = (body: string) =>
    app().request('/api/conversations', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' }
    });

  it('creates a conversation defaulting to English and the configured chat model', async () => {
    const response = await postConversation(JSON.stringify({}));

    expect(response.status).toBe(201);
    expect(conversationSchema.parse(await response.json())).toMatchObject({
      title: null,
      language: Language.English,
      model: CHAT_MODEL
    });
  });

  it('honours an explicit title, language, and model', async () => {
    const response = await postConversation(
      JSON.stringify({
        title: 'Graveyard toolbox',
        language: Language.French,
        model: 'qwen3:4b'
      })
    );

    expect(response.status).toBe(201);
    expect(conversationSchema.parse(await response.json())).toMatchObject({
      title: 'Graveyard toolbox',
      language: Language.French,
      model: 'qwen3:4b'
    });
  });

  it('lists what earlier requests created, newest first', async () => {
    await postConversation(JSON.stringify({ title: 'First' }));
    await postConversation(JSON.stringify({ title: 'Second' }));

    const response = await app().request('/api/conversations');

    expect(response.status).toBe(200);
    expect(
      conversationListSchema
        .parse(await response.json())
        .map(conversation => conversation.title)
    ).toEqual(['Second', 'First']);
  });

  it('lists a conversation that outlived the previous server', async () => {
    const created = await store.conversations.create({
      language: Language.French,
      model: CHAT_MODEL
    });
    await store.close();
    store = await openAppStore(databasePath(dataDir));

    const response = await app().request('/api/conversations');

    expect(response.status).toBe(200);
    expect(conversationListSchema.parse(await response.json())).toEqual([
      created
    ]);
  });

  it('lists nothing before anything was created', async () => {
    const response = await app().request('/api/conversations');

    expect(response.status).toBe(200);
    expect(conversationListSchema.parse(await response.json())).toEqual([]);
  });

  it('rejects an unknown language without storing anything', async () => {
    const response = await postConversation(
      JSON.stringify({ language: 'klingon' })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    await expect(store.conversations.list()).resolves.toEqual([]);
  });

  it('rejects an empty title without storing anything', async () => {
    const response = await postConversation(JSON.stringify({ title: '' }));

    expect(response.status).toBe(400);
    await expect(store.conversations.list()).resolves.toEqual([]);
  });

  it('rejects a body that is not JSON without storing anything', async () => {
    const response = await postConversation('not json at all');

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    await expect(store.conversations.list()).resolves.toEqual([]);
  });

  it('rejects a request with no body at all', async () => {
    const response = await postConversation('');

    expect(response.status).toBe(400);
    await expect(store.conversations.list()).resolves.toEqual([]);
  });

  it('rejects JSON that is not an object', async () => {
    const response = await postConversation('["fr"]');

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: expect.any(String) });
    await expect(store.conversations.list()).resolves.toEqual([]);
  });
});

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Language } from '@ygo-assistant/cards';
import {
  CardAttribute,
  CardFilterField,
  FilterOperator
} from '@ygo-assistant/cards';
import type { CardFilters } from '@ygo-assistant/cards';
import {
  MessageRole,
  conversationListSchema,
  conversationSchema,
  conversationWithMessagesSchema
} from '@ygo-assistant/contracts';
import {
  MessageRole as StoredMessageRole,
  databasePath,
  openAppStore
} from '@ygo-assistant/db';
import type { IAppStore } from '@ygo-assistant/db';
import type { ILogger } from '@ygo-assistant/logger';
import type { IOllamaClient } from '@ygo-assistant/ollama';

import { loadConfig } from '../config/index.js';
import { createServer } from './server.js';

const CHAT_MODEL = 'llama3.1:8b';

const FILTERS: CardFilters = [
  {
    field: CardFilterField.Attribute,
    operator: FilterOperator.Eq,
    value: CardAttribute.Light
  }
];

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

  describe('reopening a conversation', () => {
    const getConversation = (id: number | string) =>
      app().request(`/api/conversations/${id}`);

    const startConversation = (title?: string) =>
      store.conversations.create({
        title,
        language: Language.English,
        model: CHAT_MODEL
      });

    it('returns the conversation with its messages in the order they were said', async () => {
      const created = await startConversation('Graveyard toolbox');
      await store.messages.append({
        conversationId: created.id,
        role: StoredMessageRole.User,
        content: 'a light monster that banishes'
      });
      await store.messages.append({
        conversationId: created.id,
        role: StoredMessageRole.Assistant,
        content: 'Try these'
      });

      const response = await getConversation(created.id);

      expect(response.status).toBe(200);
      const reopened = conversationWithMessagesSchema.parse(
        await response.json()
      );
      expect(reopened).toMatchObject({
        id: created.id,
        title: 'Graveyard toolbox',
        language: Language.English,
        model: CHAT_MODEL
      });
      expect(reopened.messages.map(message => message.content)).toEqual([
        'a light monster that banishes',
        'Try these'
      ]);
      expect(reopened.messages.map(message => message.role)).toEqual([
        MessageRole.User,
        MessageRole.Assistant
      ]);
    });

    it('carries the filters and card ids a reply suggested', async () => {
      const created = await startConversation();
      await store.messages.append({
        conversationId: created.id,
        role: StoredMessageRole.Assistant,
        content: 'Try these',
        filters: FILTERS,
        cardIds: [46986414]
      });

      const response = await getConversation(created.id);

      const reopened = conversationWithMessagesSchema.parse(
        await response.json()
      );
      expect(reopened.messages[0].filters).toEqual(FILTERS);
      expect(reopened.messages[0].cardIds).toEqual([46986414]);
    });

    it('returns a conversation nothing was said in with no messages', async () => {
      const created = await startConversation();

      const response = await getConversation(created.id);

      expect(response.status).toBe(200);
      expect(
        conversationWithMessagesSchema.parse(await response.json()).messages
      ).toEqual([]);
    });

    it('names the conversation after its first user message', async () => {
      const created = await startConversation();
      await store.messages.append({
        conversationId: created.id,
        role: StoredMessageRole.User,
        content: 'a light monster that banishes'
      });

      const response = await getConversation(created.id);

      expect(
        conversationWithMessagesSchema.parse(await response.json()).title
      ).toBe('a light monster that banishes');
    });

    it('answers an unknown conversation with not found', async () => {
      const response = await getConversation(404);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: expect.any(String) });
    });

    it('answers an id that is not a number with not found', async () => {
      const response = await getConversation('lately');

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: expect.any(String) });
    });

    it('answers an id that only spells a number with not found', async () => {
      await startConversation();

      const responses = await Promise.all(
        ['+1', '1e0', '1.0', '0x1', '1abc'].map(form => getConversation(form))
      );

      expect(responses.map(response => response.status)).toEqual([
        404, 404, 404, 404, 404
      ]);
    });

    it('shows a message that outlived the previous server', async () => {
      const created = await startConversation();
      await store.messages.append({
        conversationId: created.id,
        role: StoredMessageRole.User,
        content: 'a light monster that banishes'
      });
      await store.close();
      store = await openAppStore(databasePath(dataDir));

      const response = await getConversation(created.id);

      const reopened = conversationWithMessagesSchema.parse(
        await response.json()
      );
      expect(reopened.messages.map(message => message.content)).toEqual([
        'a light monster that banishes'
      ]);
    });
  });
});

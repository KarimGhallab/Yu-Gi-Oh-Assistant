import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Card, CardFilters } from '@ygo-assistant/cards';
import {
  CardAttribute,
  CardFilterField,
  CardType,
  FilterOperator,
  FrameType,
  Language
} from '@ygo-assistant/cards';
import {
  MessageRole,
  conversationListSchema,
  conversationSchema,
  conversationWithMessagesSchema
} from '@ygo-assistant/contracts';
import type { IAppStore } from '@ygo-assistant/db';
import {
  MessageRole as StoredMessageRole,
  buildCardIndex,
  databasePath,
  openAppStore
} from '@ygo-assistant/db';
import type { ILogger } from '@ygo-assistant/logger';
import type { IOllamaClient } from '@ygo-assistant/ollama';
import { delay } from '@ygo-assistant/utils';

import { loadConfig } from '../../config/index.js';
import { createServer } from '../createServer.js';

const CHAT_MODEL = 'llama3.1:8b';

/** An id no conversation has, in the shape the API hands out. */
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

const DIMENSIONS = 3;
const EMBEDDING_MODEL = 'nomic-embed-text:latest';
const MAGICIAN_ID = 46986414;
const GREED_ID = 55144522;

const FILTERS: CardFilters = [
  {
    field: CardFilterField.Attribute,
    operator: FilterOperator.Eq,
    value: CardAttribute.Light
  }
];

const createCard = (id: number, overrides: Partial<Card> = {}): Card => ({
  id,
  name: 'Dark Magician',
  language: Language.English,
  type: CardType.NormalMonster,
  frameType: FrameType.Normal,
  typeLine: ['Spellcaster', 'Normal'],
  race: 'Spellcaster',
  attribute: CardAttribute.Dark,
  level: 7,
  atk: 2500,
  def: 2100,
  linkMarkers: [],
  effect: 'The ultimate wizard in terms of attack and defense.',
  imageUrl: 'https://images.ygoprodeck.com/images/cards/46986414.jpg',
  sourceUrl: 'https://ygoprodeck.com/card/dark-magician-4698',
  ...overrides
});

/**
 * One card the index holds in both languages, and one it holds in English only,
 * so a read can be told to prefer a language and still fall back.
 */
const ENGLISH_MAGICIAN = createCard(MAGICIAN_ID);
const FRENCH_MAGICIAN = createCard(MAGICIAN_ID, {
  language: Language.French,
  name: 'Magicien Sombre'
});
const ENGLISH_GREED = createCard(GREED_ID, {
  name: 'Pot of Greed',
  type: CardType.SpellCard,
  frameType: FrameType.Spell,
  typeLine: ['Spell'],
  race: 'Normal',
  attribute: undefined,
  level: undefined,
  atk: undefined,
  def: undefined,
  effect: 'Draw 2 cards.'
});

const silentLogger: ILogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
};

const ollamaStub: IOllamaClient = {
  // The one model the machine has, which is what a conversation nobody has
  // configured a model for is started on.
  listModels: async () => [
    {
      name: CHAT_MODEL,
      supportsCompletion: true,
      supportsStructuredOutput: true
    }
  ],
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

  const app = (ollama: IOllamaClient = ollamaStub) =>
    createServer({
      config: loadConfig({ DATA_DIR: dataDir }),
      logger: silentLogger,
      ollama,
      store
    });

  it('starts a conversation on the first model that can answer', async () => {
    const client: IOllamaClient = {
      // An embedding model sorts first, and cannot answer: the conversation has
      // to start on the first model that can, not on the first name in the list.
      listModels: async () => [
        {
          name: 'aaa-embed-text',
          supportsCompletion: false,
          supportsStructuredOutput: false
        },
        {
          name: 'mistral:7b',
          supportsCompletion: true,
          supportsStructuredOutput: false
        }
      ],
      embed: async () => [],
      chat: async function* chatForNothing() {}
    };

    const response = await app(client).request('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' }
    });

    const created: unknown = await response.json();

    expect(response.status).toBe(201);
    expect(conversationSchema.parse(created).model).toBe('mistral:7b');
  });

  const seedIndex = async (cards: Card[]): Promise<void> => {
    const embedder: IOllamaClient = {
      listModels: async () => [],
      embed: async inputs => inputs.map((_, index) => [index + 1, 0, 0]),
      chat: () => {
        throw new Error('Building the index never streams chat completions');
      }
    };

    await buildCardIndex({
      dataDir,
      cards,
      embedder,
      embeddingModel: EMBEDDING_MODEL,
      dimensions: DIMENSIONS,
      datasetVersion: 'ygoprodeck-2026-09-16'
    });
  };

  const postConversation = (body: string) =>
    app().request('/api/conversations', {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json' }
    });

  const getConversation = (id: string) =>
    app().request(`/api/conversations/${id}`);

  const startConversation = (title?: string) =>
    store.conversations.create({
      title,
      language: Language.English,
      model: CHAT_MODEL
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
      expect(reopened.messages.map(message => message.cards)).toEqual([
        undefined,
        undefined
      ]);
    });

    it('carries the filters and the cards a reply suggested', async () => {
      const created = await startConversation();
      await seedIndex([ENGLISH_MAGICIAN, FRENCH_MAGICIAN]);
      await store.messages.append({
        conversationId: created.id,
        role: StoredMessageRole.Assistant,
        content: 'Try these',
        filters: FILTERS,
        cardIds: [MAGICIAN_ID]
      });

      const response = await getConversation(created.id);

      const reopened = conversationWithMessagesSchema.parse(
        await response.json()
      );
      expect(reopened.messages[0].filters).toEqual(FILTERS);
      expect(reopened.messages[0].cards).toEqual([ENGLISH_MAGICIAN]);
    });

    it('reads a stored turn in the conversation language, falling back for a card that only exists in the other one', async () => {
      const created = await store.conversations.create({
        language: Language.French,
        model: CHAT_MODEL
      });
      await seedIndex([ENGLISH_MAGICIAN, FRENCH_MAGICIAN, ENGLISH_GREED]);
      await store.messages.append({
        conversationId: created.id,
        role: StoredMessageRole.User,
        content: 'des cartes pour un deck bannissement'
      });
      await store.messages.append({
        conversationId: created.id,
        role: StoredMessageRole.Assistant,
        content: 'Essayez ceux-ci',
        // Deliberately not in ascending id order, so the answer can only come
        // back in this order by keeping the order the turn ranked the cards in.
        cardIds: [GREED_ID, MAGICIAN_ID]
      });

      const response = await getConversation(created.id);

      const reopened = conversationWithMessagesSchema.parse(
        await response.json()
      );
      expect(reopened.messages.map(message => message.cards)).toEqual([
        undefined,
        [ENGLISH_GREED, FRENCH_MAGICIAN]
      ]);
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
      const response = await getConversation(MISSING_ID);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: expect.any(String) });
    });

    it('answers an id that is not a uuid with not found', async () => {
      const response = await getConversation('lately');

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: expect.any(String) });
    });

    it('answers an id that only spells a number with not found', async () => {
      await startConversation();

      const responses = await Promise.all(
        ['+1', '1e0', '1.0', '0x1', '1abc', '0001', '0'].map(form =>
          getConversation(form)
        )
      );

      expect(responses.map(response => response.status)).toEqual([
        404, 404, 404, 404, 404, 404, 404
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

  describe('managing a conversation', () => {
    const patchConversation = (id: string, body: string) =>
      app().request(`/api/conversations/${id}`, {
        method: 'PATCH',
        body,
        headers: { 'content-type': 'application/json' }
      });

    const deleteConversation = (id: string) =>
      app().request(`/api/conversations/${id}`, { method: 'DELETE' });

    it('renames a conversation and returns it renamed', async () => {
      const created = await startConversation();

      const response = await patchConversation(
        created.id,
        JSON.stringify({ title: 'Graveyard toolbox' })
      );

      expect(response.status).toBe(200);
      expect(conversationSchema.parse(await response.json())).toMatchObject({
        id: created.id,
        title: 'Graveyard toolbox',
        language: Language.English,
        model: CHAT_MODEL
      });
    });

    it('reopens a conversation with the settings it was given', async () => {
      const created = await startConversation();

      await patchConversation(
        created.id,
        JSON.stringify({
          title: 'Graveyard toolbox',
          language: Language.French,
          model: 'qwen3:4b'
        })
      );
      const response = await app().request(`/api/conversations/${created.id}`);

      expect(
        conversationWithMessagesSchema.parse(await response.json())
      ).toMatchObject({
        title: 'Graveyard toolbox',
        language: Language.French,
        model: 'qwen3:4b'
      });
    });

    it('moves a renamed conversation to the front of the list', async () => {
      const first = await startConversation('First');
      await startConversation('Second');
      await delay(5);

      await patchConversation(
        first.id,
        JSON.stringify({ title: 'Renamed first' })
      );
      const response = await app().request('/api/conversations');

      expect(
        conversationListSchema
          .parse(await response.json())
          .map(conversation => conversation.title)
      ).toEqual(['Renamed first', 'Second']);
    });

    it('rejects a malformed patch body without changing anything', async () => {
      const created = await startConversation('Graveyard toolbox');

      const response = await patchConversation(
        created.id,
        JSON.stringify({ language: 'klingon' })
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: expect.any(String) });
      await expect(store.conversations.find(created.id)).resolves.toMatchObject(
        { title: 'Graveyard toolbox', language: Language.English }
      );
    });

    it('rejects a patch body that is not JSON without changing anything', async () => {
      const created = await startConversation('Graveyard toolbox');

      const response = await patchConversation(created.id, 'not json at all');

      expect(response.status).toBe(400);
      await expect(store.conversations.find(created.id)).resolves.toMatchObject(
        { title: 'Graveyard toolbox' }
      );
    });

    it('answers an unknown conversation with not found on both endpoints', async () => {
      const patch = await patchConversation(MISSING_ID, JSON.stringify({}));
      const remove = await deleteConversation(MISSING_ID);

      expect(patch.status).toBe(404);
      expect(remove.status).toBe(404);
    });

    it('answers an id that only spells a number with not found on both endpoints', async () => {
      await startConversation();

      const responses = await Promise.all(
        ['+1', '1e0'].flatMap(form => [
          patchConversation(form, JSON.stringify({})),
          deleteConversation(form)
        ])
      );

      expect(responses.map(response => response.status)).toEqual([
        404, 404, 404, 404
      ]);
    });

    it('deletes a conversation and everything said in it', async () => {
      const created = await startConversation();
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

      const response = await deleteConversation(created.id);

      expect(response.status).toBe(204);
      expect(await response.text()).toBe('');
      expect((await getConversation(created.id)).status).toBe(404);
      await expect(
        store.conversations.find(created.id)
      ).resolves.toBeUndefined();
      await expect(store.messages.list(created.id)).resolves.toEqual([]);
    });

    it('leaves the other conversations and their messages alone', async () => {
      const doomed = await startConversation('Doomed');
      const kept = await startConversation('Kept');
      await store.messages.append({
        conversationId: kept.id,
        role: StoredMessageRole.User,
        content: 'a dark monster that searches'
      });

      await deleteConversation(doomed.id);

      const listed = await app().request('/api/conversations');
      expect(
        conversationListSchema
          .parse(await listed.json())
          .map(conversation => conversation.id)
      ).toEqual([kept.id]);
      const reopened = conversationWithMessagesSchema.parse(
        await (await getConversation(kept.id)).json()
      );
      expect(reopened.messages.map(message => message.content)).toEqual([
        'a dark monster that searches'
      ]);
    });
  });
});

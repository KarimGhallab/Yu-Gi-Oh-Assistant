import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CardFilters } from '@ygo-assistant/cards';
import {
  CardAttribute,
  CardFilterField,
  FilterOperator,
  Language
} from '@ygo-assistant/cards';
import { NotFoundError } from '@ygo-assistant/utils';

import { openAppStore } from '../app/SqliteAppStore.js';

import { StoredValueError } from '../../storedValue.js';
import { databasePath } from '../databasePath.js';
import type { IAppStore } from '../types.js';
import { MessageRole } from '../types.js';

const MODEL = 'llama3.1:8b';

/** An id no conversation has, in the shape the store hands out. */
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

const FILTERS: CardFilters = [
  {
    field: CardFilterField.Attribute,
    operator: FilterOperator.Eq,
    value: CardAttribute.Light
  }
];

describe('app store messages', () => {
  let dataDir: string;
  let store: IAppStore;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'ygo-assistant-messages-'));
    store = await openAppStore(databasePath(dataDir));
  });

  afterEach(async () => {
    await store.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  const createConversation = (title?: string) =>
    store.conversations.create({
      title,
      language: Language.English,
      model: MODEL
    });

  it('appends messages and lists them in the order they were written', async () => {
    const conversation = await createConversation();

    await store.messages.append({
      conversationId: conversation.id,
      role: MessageRole.User,
      content: 'a light monster that banishes'
    });
    await store.messages.append({
      conversationId: conversation.id,
      role: MessageRole.Assistant,
      content: 'Try these'
    });

    const messages = await store.messages.list(conversation.id);

    expect(messages.map(message => message.content)).toEqual([
      'a light monster that banishes',
      'Try these'
    ]);
    expect(messages.map(message => message.role)).toEqual([
      MessageRole.User,
      MessageRole.Assistant
    ]);
    expect(messages[0].id).not.toBe(messages[1].id);
    expect(messages[0].conversationId).toBe(conversation.id);
    expect(Number.isNaN(Date.parse(messages[0].createdAt))).toBe(false);
  });

  it('lists no messages before anything was said', async () => {
    const conversation = await createConversation();

    await expect(store.messages.list(conversation.id)).resolves.toEqual([]);
  });

  it('names an untitled conversation after its first user message', async () => {
    const conversation = await createConversation();

    await store.messages.append({
      conversationId: conversation.id,
      role: MessageRole.User,
      content: 'a light monster that banishes'
    });

    const reopened = await store.conversations.find(conversation.id);

    expect(reopened?.title).toBe('a light monster that banishes');
  });

  it('keeps the title a conversation was given explicitly', async () => {
    const conversation = await createConversation('Graveyard toolbox');

    await store.messages.append({
      conversationId: conversation.id,
      role: MessageRole.User,
      content: 'a light monster that banishes'
    });

    const reopened = await store.conversations.find(conversation.id);

    expect(reopened?.title).toBe('Graveyard toolbox');
  });

  it('does not name a conversation after an assistant message', async () => {
    const conversation = await createConversation();

    await store.messages.append({
      conversationId: conversation.id,
      role: MessageRole.Assistant,
      content: 'Try these'
    });

    await expect(
      store.conversations.find(conversation.id)
    ).resolves.toMatchObject({ title: null });
  });

  it('names a conversation from the first user message after a reply', async () => {
    const conversation = await createConversation();

    await store.messages.append({
      conversationId: conversation.id,
      role: MessageRole.Assistant,
      content: 'Try these'
    });
    await store.messages.append({
      conversationId: conversation.id,
      role: MessageRole.User,
      content: 'a light monster that banishes'
    });

    const reopened = await store.conversations.find(conversation.id);

    expect(reopened?.title).toBe('a light monster that banishes');
  });

  it('names a conversation only once', async () => {
    const conversation = await createConversation();

    await store.messages.append({
      conversationId: conversation.id,
      role: MessageRole.User,
      content: 'First request'
    });
    await store.messages.append({
      conversationId: conversation.id,
      role: MessageRole.User,
      content: 'Second request'
    });

    const reopened = await store.conversations.find(conversation.id);

    expect(reopened?.title).toBe('First request');
  });

  it('round-trips the search record and card ids a reply carried', async () => {
    const conversation = await createConversation();

    await store.messages.append({
      conversationId: conversation.id,
      role: MessageRole.User,
      content: 'a light monster that banishes'
    });
    await store.messages.append({
      conversationId: conversation.id,
      role: MessageRole.Assistant,
      content: 'Try these',
      search: {
        filters: FILTERS,
        query: 'a light monster',
        status: 'free-text-only'
      },
      cardIds: [46986414, 89631139]
    });

    const messages = await store.messages.list(conversation.id);

    expect(messages[1].search).toEqual({
      filters: FILTERS,
      query: 'a light monster',
      status: 'free-text-only'
    });
    expect(messages[1].cardIds).toEqual([46986414, 89631139]);
    expect(messages[0].search).toBeUndefined();
    expect(messages[0].cardIds).toBeUndefined();
  });

  it('keeps a filter set that was empty apart from no filter set', async () => {
    const conversation = await createConversation();

    await store.messages.append({
      conversationId: conversation.id,
      role: MessageRole.Assistant,
      content: 'Anything goes',
      search: { filters: [] },
      cardIds: []
    });

    const messages = await store.messages.list(conversation.id);

    expect(messages[0].search).toEqual({ filters: [] });
    expect(messages[0].cardIds).toEqual([]);
  });

  it('raises a stored search whose filters no longer satisfy the vocabulary', async () => {
    const path = databasePath(dataDir);
    const conversation = await createConversation();

    await store.messages.append({
      conversationId: conversation.id,
      role: MessageRole.Assistant,
      content: 'Try these',
      search: { filters: FILTERS }
    });
    await store.close();

    const database = new DatabaseSync(path);
    database.exec(
      `UPDATE messages SET search_json = '{"filters":[{"field":"nonsense","operator":"eq","value":1}]}'`
    );
    database.close();

    store = await openAppStore(path);

    await expect(store.messages.list(conversation.id)).rejects.toThrow();
  });

  it('raises a stored search whose free text is not a string', async () => {
    const path = databasePath(dataDir);
    const conversation = await createConversation();

    await store.messages.append({
      conversationId: conversation.id,
      role: MessageRole.Assistant,
      content: 'Try these',
      search: { filters: FILTERS }
    });
    await store.close();

    const database = new DatabaseSync(path);
    database.exec(
      `UPDATE messages SET search_json = '{"filters":[],"query":7}'`
    );
    database.close();

    store = await openAppStore(path);

    await expect(store.messages.list(conversation.id)).rejects.toThrow(
      StoredValueError
    );
  });

  it('keeps the messages of one conversation out of another', async () => {
    const first = await createConversation();
    const second = await createConversation();

    await store.messages.append({
      conversationId: first.id,
      role: MessageRole.User,
      content: 'First conversation'
    });
    await store.messages.append({
      conversationId: second.id,
      role: MessageRole.User,
      content: 'Second conversation'
    });

    const messages = await store.messages.list(first.id);

    expect(messages.map(message => message.content)).toEqual([
      'First conversation'
    ]);
  });

  it('refuses to append to a conversation that does not exist', async () => {
    await expect(
      store.messages.append({
        conversationId: MISSING_ID,
        role: MessageRole.User,
        content: 'Hello'
      })
    ).rejects.toThrow(NotFoundError);
  });

  it('survives closing and reopening the store', async () => {
    const path = databasePath(dataDir);
    const conversation = await createConversation();
    const created = await store.messages.append({
      conversationId: conversation.id,
      role: MessageRole.User,
      content: 'a light monster that banishes'
    });
    await store.close();

    store = await openAppStore(path);

    await expect(store.messages.list(conversation.id)).resolves.toEqual([
      created
    ]);
  });
});

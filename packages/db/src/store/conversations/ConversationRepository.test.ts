import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Language } from '@ygo-assistant/cards';
import { NotFoundError, delay } from '@ygo-assistant/utils';

import { openAppStore } from '../app/SqliteAppStore.js';

import { databasePath } from '../databasePath.js';
import { MessageRole } from '../types.js';
import type { CreateConversationInput, IAppStore } from '../types.js';

const MODEL = 'llama3.1:8b';

/** The shape of the identity every conversation and message is given. */
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** An id no conversation has, in the shape the store hands out. */
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

describe('app store conversations', () => {
  let dataDir: string;
  let store: IAppStore;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'ygo-assistant-conversations-'));
    store = await openAppStore(databasePath(dataDir));
  });

  afterEach(async () => {
    await store.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  const createConversation = (
    overrides: Partial<CreateConversationInput> = {}
  ) =>
    store.conversations.create({
      language: Language.English,
      model: MODEL,
      ...overrides
    });

  it('creates an untitled conversation from the given language and model', async () => {
    const conversation = await createConversation({
      language: Language.French
    });

    expect(conversation.title).toBeNull();
    expect(conversation.language).toBe(Language.French);
    expect(conversation.model).toBe(MODEL);
    expect(conversation.id).toMatch(UUID);
    expect(conversation.createdAt).toBe(conversation.updatedAt);
    expect(Number.isNaN(Date.parse(conversation.createdAt))).toBe(false);
  });

  it('keeps a title that was given explicitly', async () => {
    const conversation = await createConversation({
      title: 'Banishing light monsters'
    });

    expect(conversation.title).toBe('Banishing light monsters');
  });

  it('lists nothing before anything was created', async () => {
    await expect(store.conversations.list()).resolves.toEqual([]);
  });

  it('lists conversations newest first', async () => {
    const first = await createConversation();
    const second = await createConversation();
    const third = await createConversation();

    const listed = await store.conversations.list();

    expect(listed.map(conversation => conversation.id)).toEqual([
      third.id,
      second.id,
      first.id
    ]);
  });

  it('finds a conversation by its id', async () => {
    const created = await createConversation({ language: Language.French });

    await expect(store.conversations.find(created.id)).resolves.toEqual(
      created
    );
  });

  it('has no conversation for an id that was never used', async () => {
    await expect(store.conversations.find(MISSING_ID)).resolves.toBeUndefined();
  });

  it('survives closing and reopening the store', async () => {
    const path = databasePath(dataDir);
    const created = await createConversation();
    await store.close();

    store = await openAppStore(path);

    await expect(store.conversations.list()).resolves.toEqual([created]);
  });

  it('renames a conversation without disturbing its other settings', async () => {
    const created = await createConversation({ language: Language.French });

    const updated = await store.conversations.update(created.id, {
      title: 'Graveyard toolbox'
    });

    expect(updated).toMatchObject({
      id: created.id,
      title: 'Graveyard toolbox',
      language: Language.French,
      model: created.model,
      createdAt: created.createdAt
    });
  });

  it('changes the language and the model without disturbing the title', async () => {
    const created = await createConversation({ title: 'Graveyard toolbox' });

    const updated = await store.conversations.update(created.id, {
      language: Language.French,
      model: 'qwen3:4b'
    });

    expect(updated).toMatchObject({
      id: created.id,
      title: 'Graveyard toolbox',
      language: Language.French,
      model: 'qwen3:4b'
    });
  });

  it('keeps the change once the conversation is read again', async () => {
    const created = await createConversation();

    await store.conversations.update(created.id, {
      title: 'Graveyard toolbox',
      language: Language.French,
      model: 'qwen3:4b'
    });

    await expect(store.conversations.find(created.id)).resolves.toMatchObject({
      title: 'Graveyard toolbox',
      language: Language.French,
      model: 'qwen3:4b'
    });
  });

  it('touches the modified time of a conversation it updates', async () => {
    const created = await createConversation();
    await delay(5);

    const updated = await store.conversations.update(created.id, {
      title: 'Graveyard toolbox'
    });

    expect(Date.parse(updated.updatedAt)).toBeGreaterThan(
      Date.parse(created.updatedAt)
    );
    expect(updated.createdAt).toBe(created.createdAt);
  });

  it('leaves the fields a patch does not name alone and still moves the modified time', async () => {
    const created = await createConversation({ title: 'Graveyard toolbox' });
    await delay(5);

    const updated = await store.conversations.update(created.id, {});

    expect(updated).toMatchObject({
      title: 'Graveyard toolbox',
      language: created.language,
      model: created.model,
      createdAt: created.createdAt
    });
    expect(Date.parse(updated.updatedAt)).toBeGreaterThan(
      Date.parse(created.updatedAt)
    );
  });

  it('refuses to update a conversation that does not exist', async () => {
    await expect(
      store.conversations.update(MISSING_ID, { title: 'Graveyard toolbox' })
    ).rejects.toThrow(NotFoundError);
  });

  it('deletes a conversation and everything said in it', async () => {
    const created = await createConversation();
    await store.messages.append({
      conversationId: created.id,
      role: MessageRole.User,
      content: 'a light monster that banishes'
    });

    await store.conversations.delete(created.id);

    await expect(store.conversations.find(created.id)).resolves.toBeUndefined();
    await expect(store.messages.list(created.id)).resolves.toEqual([]);
  });

  it('leaves the other conversations and their messages intact', async () => {
    const doomed = await createConversation({ title: 'Doomed' });
    const kept = await createConversation({ title: 'Kept' });
    await store.messages.append({
      conversationId: doomed.id,
      role: MessageRole.User,
      content: 'a light monster that banishes'
    });
    await store.messages.append({
      conversationId: kept.id,
      role: MessageRole.User,
      content: 'a dark monster that searches'
    });

    await store.conversations.delete(doomed.id);

    await expect(store.conversations.list()).resolves.toMatchObject([
      { id: kept.id, title: 'Kept' }
    ]);
    await expect(store.messages.list(kept.id)).resolves.toMatchObject([
      { conversationId: kept.id, content: 'a dark monster that searches' }
    ]);
  });

  it('refuses to delete a conversation that does not exist', async () => {
    await expect(store.conversations.delete(MISSING_ID)).rejects.toThrow(
      NotFoundError
    );
  });
});

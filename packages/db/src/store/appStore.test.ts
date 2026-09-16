import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Language } from '@ygo-assistant/cards';

import { openAppStore } from './appStore.js';
import { databasePath } from './paths.js';
import type { IAppStore } from './types.js';

const MODEL = 'llama3.1:8b';

describe('app store conversations', () => {
  let dataDir: string;
  let store: IAppStore | undefined;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'ygo-assistant-store-'));
  });

  afterEach(async () => {
    await store?.close();
    store = undefined;
    await rm(dataDir, { recursive: true, force: true });
  });

  it('holds its database file under the data directory', async () => {
    const path = databasePath(dataDir);

    store = await openAppStore(path);

    expect((await stat(path)).isFile()).toBe(true);
  });

  it('creates an untitled conversation from the given language and model', async () => {
    store = await openAppStore(databasePath(dataDir));

    const conversation = await store.conversations.create({
      language: Language.French,
      model: MODEL
    });

    expect(conversation.title).toBeNull();
    expect(conversation.language).toBe(Language.French);
    expect(conversation.model).toBe(MODEL);
    expect(conversation.id).toBeGreaterThan(0);
    expect(conversation.createdAt).toBe(conversation.updatedAt);
    expect(Number.isNaN(Date.parse(conversation.createdAt))).toBe(false);
  });

  it('keeps a title that was given explicitly', async () => {
    store = await openAppStore(databasePath(dataDir));

    const conversation = await store.conversations.create({
      title: 'Banishing light monsters',
      language: Language.English,
      model: MODEL
    });

    expect(conversation.title).toBe('Banishing light monsters');
  });

  it('lists nothing before anything was created', async () => {
    store = await openAppStore(databasePath(dataDir));

    await expect(store.conversations.list()).resolves.toEqual([]);
  });

  it('finds a conversation by its id', async () => {
    store = await openAppStore(databasePath(dataDir));
    const created = await store.conversations.create({
      language: Language.French,
      model: MODEL
    });

    await expect(store.conversations.find(created.id)).resolves.toEqual(
      created
    );
  });

  it('has no conversation for an id that was never used', async () => {
    store = await openAppStore(databasePath(dataDir));

    await expect(store.conversations.find(404)).resolves.toBeUndefined();
  });

  it('lists conversations newest first', async () => {
    store = await openAppStore(databasePath(dataDir));
    const input = { language: Language.English, model: MODEL };

    const first = await store.conversations.create(input);
    const second = await store.conversations.create(input);
    const third = await store.conversations.create(input);

    const listed = await store.conversations.list();

    expect(listed.map(conversation => conversation.id)).toEqual([
      third.id,
      second.id,
      first.id
    ]);
    expect(listed.map(conversation => conversation.title)).toEqual([
      null,
      null,
      null
    ]);
  });

  it('survives closing and reopening the store', async () => {
    const path = databasePath(dataDir);
    const first = await openAppStore(path);
    const created = await first.conversations.create({
      language: Language.English,
      model: MODEL
    });
    await first.close();

    store = await openAppStore(path);

    await expect(store.conversations.list()).resolves.toEqual([created]);
  });

  it('migrates a database file that already exists', async () => {
    const path = databasePath(dataDir);
    const existing = new DatabaseSync(path);
    existing.close();

    store = await openAppStore(path);
    await store.conversations.create({
      language: Language.English,
      model: MODEL
    });

    await expect(store.conversations.list()).resolves.toHaveLength(1);
  });

  it('leaves a database that has a newer migration than this build alone', async () => {
    const path = databasePath(dataDir);
    const existing = await openAppStore(path);
    await existing.close();
    const ahead = new DatabaseSync(path);
    ahead
      .prepare(
        'INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)'
      )
      .run(99, 'a migration from a later build', new Date().toISOString());
    ahead.close();

    store = await openAppStore(path);

    await expect(store.conversations.list()).resolves.toEqual([]);
  });
});

import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Language } from '@ygo-assistant/cards';

import { databasePath } from '../databasePath.js';
import type { IAppStore } from '../types.js';
import { openAppStore } from './SqliteAppStore.js';

const MODEL = 'llama3.1:8b';

describe('app store', () => {
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

  it('starts the conversations and messages over when ids become uuids', async () => {
    const path = databasePath(dataDir);
    const before = new DatabaseSync(path);
    before.exec(`
      CREATE TABLE schema_migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
      CREATE TABLE conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        language TEXT NOT NULL,
        model TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        filters_json TEXT,
        card_ids_json TEXT,
        created_at TEXT NOT NULL
      );
      INSERT INTO schema_migrations (id, name, applied_at)
        VALUES (1, 'conversations', '2026-01-01T00:00:00.000Z');
      INSERT INTO schema_migrations (id, name, applied_at)
        VALUES (2, 'messages', '2026-01-01T00:00:00.000Z');
      INSERT INTO conversations (id, title, language, model, created_at, updated_at)
        VALUES (7, 'Graveyard toolbox', 'en', '${MODEL}',
                '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
      INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES (3, 7, 'user', 'a light monster that banishes', '2026-01-01T00:00:01.000Z');
    `);
    before.close();

    store = await openAppStore(path);

    // The row that was written under an integer id is not carried over: its id
    // is a number and this build has no conversation that number can name.
    await expect(store.conversations.list()).resolves.toEqual([]);

    const created = await store.conversations.create({
      language: Language.English,
      model: MODEL
    });
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );

    await expect(store.messages.list(created.id)).resolves.toEqual([]);
  });
});

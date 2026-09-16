import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Language } from '@ygo-assistant/cards';

import { databasePath } from '../paths.js';
import type { IAppStore } from '../types.js';
import { openAppStore } from './appStore.js';

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
});

import { stat } from 'node:fs/promises';

import { afterEach, describe, expect, it } from 'vitest';

import { databasePath, openAppStore } from '@ygo-assistant/db';
import type { IAppStore } from '@ygo-assistant/db';
import type { ILogger } from '@ygo-assistant/logger';
import { FakeOllamaClient, TempDataDir } from '@ygo-assistant/test-support';

import { loadConfig } from '../config/index.js';
import { createServer } from './server.js';

const silentLogger: ILogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
};

const isDirectory = async (path: string): Promise<boolean> =>
  (await stat(path)).isDirectory();

const isFile = async (path: string): Promise<boolean> =>
  (await stat(path)).isFile();

describe('composition root with test doubles', () => {
  let dataDir: TempDataDir | undefined;
  let store: IAppStore | undefined;

  afterEach(async () => {
    await store?.close();
    store = undefined;
    await dataDir?.cleanup();
    dataDir = undefined;
  });

  it('builds and serves the app with a fake Ollama client and a temporary data directory', async () => {
    dataDir = await TempDataDir.create();
    const models = [{ name: 'canned:1b', supportsStructuredOutput: true }];
    const ollama = new FakeOllamaClient({ models });
    store = await openAppStore(databasePath(dataDir.path));

    const app = createServer({
      config: loadConfig({ DATA_DIR: dataDir.path }),
      logger: silentLogger,
      ollama,
      store
    });

    const response = await app.request('/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(await isDirectory(dataDir.path)).toBe(true);
    expect(await isFile(databasePath(dataDir.path))).toBe(true);
    await expect(ollama.listModels()).resolves.toEqual(models);
  });
});

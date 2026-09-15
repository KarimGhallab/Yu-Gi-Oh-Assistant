import { stat } from 'node:fs/promises';
import type { ILogger } from '@ygo-assistant/logger';
import { FakeOllamaClient, TempDataDir } from '@ygo-assistant/test-support';
import { afterEach, describe, expect, it } from 'vitest';

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

describe('composition root with test doubles', () => {
  let dataDir: TempDataDir | undefined;

  afterEach(async () => {
    await dataDir?.cleanup();
    dataDir = undefined;
  });

  it('builds and serves the app with a fake Ollama client and a temporary data directory', async () => {
    dataDir = await TempDataDir.create();
    const models = [{ name: 'canned:1b', supportsStructuredOutput: true }];
    const ollama = new FakeOllamaClient({ models });

    const app = createServer({
      config: loadConfig({ DATA_DIR: dataDir.path }),
      logger: silentLogger,
      ollama
    });

    const response = await app.request('/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(await isDirectory(dataDir.path)).toBe(true);
    await expect(ollama.listModels()).resolves.toEqual(models);
  });
});

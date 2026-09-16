import { afterEach, describe, expect, it } from 'vitest';

import { buildCardIndex } from '@ygo-assistant/db';
import { FakeOllamaClient, TempDataDir } from '@ygo-assistant/test-support';

import { loadConfig } from '../config/index.js';
import { StaleIndexError, ensureIndexMatchesConfig } from './indexGuard.js';

const EMBEDDING_MODEL = 'qwen3-embedding:0.6b';
const EMBEDDING_DIMENSIONS = 1024;

const captureError = async (operation: Promise<unknown>): Promise<Error> => {
  try {
    await operation;
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected the operation to reject');
};

const buildIndex = (
  dataDir: string,
  embeddingModel: string = EMBEDDING_MODEL,
  dimensions: number = EMBEDDING_DIMENSIONS
) =>
  buildCardIndex({
    dataDir,
    cards: [],
    embedder: new FakeOllamaClient(),
    embeddingModel,
    dimensions,
    datasetVersion: 'ygoprodeck-test'
  });

const configFor = (dataDir: string, overrides: Record<string, string> = {}) =>
  loadConfig({
    DATA_DIR: dataDir,
    OLLAMA_EMBEDDING_MODEL: EMBEDDING_MODEL,
    OLLAMA_EMBEDDING_DIMENSIONS: String(EMBEDDING_DIMENSIONS),
    ...overrides
  });

describe('ensureIndexMatchesConfig', () => {
  let dataDir: TempDataDir | undefined;

  afterEach(async () => {
    await dataDir?.cleanup();
    dataDir = undefined;
  });

  it('passes silently when the index matches the configuration', async () => {
    dataDir = await TempDataDir.create();
    await buildIndex(dataDir.path);

    await expect(
      ensureIndexMatchesConfig(configFor(dataDir.path))
    ).resolves.toBeUndefined();
  });

  it('fails when the index was built with a different embedding model', async () => {
    dataDir = await TempDataDir.create();
    await buildIndex(dataDir.path, 'other-embedding:1b');

    const error = await captureError(
      ensureIndexMatchesConfig(configFor(dataDir.path))
    );

    expect(error).toBeInstanceOf(StaleIndexError);
    expect(error.message).toContain('db:populate');
    expect(error.message).toContain('other-embedding:1b');
  });

  it('fails when the index was built with different dimensions', async () => {
    dataDir = await TempDataDir.create();
    await buildIndex(dataDir.path, EMBEDDING_MODEL, 768);

    const error = await captureError(
      ensureIndexMatchesConfig(configFor(dataDir.path))
    );

    expect(error).toBeInstanceOf(StaleIndexError);
    expect(error.message).toContain('db:populate');
  });

  it('fails when there is no index', async () => {
    dataDir = await TempDataDir.create();

    const error = await captureError(
      ensureIndexMatchesConfig(configFor(dataDir.path))
    );

    expect(error).toBeInstanceOf(StaleIndexError);
    expect(error.message).toContain('db:populate');
  });
});

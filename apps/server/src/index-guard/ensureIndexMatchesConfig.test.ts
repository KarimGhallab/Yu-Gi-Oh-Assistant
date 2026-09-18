import { describe, expect, it } from 'vitest';

import { InMemoryCardCatalog } from '@ygo-assistant/db/testing';

import { loadConfig } from '../config/index.js';
import {
  StaleIndexError,
  ensureIndexMatchesConfig
} from './ensureIndexMatchesConfig.js';

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

const catalogWith = (
  embeddingModel: string = EMBEDDING_MODEL,
  dimensions: number = EMBEDDING_DIMENSIONS
): InMemoryCardCatalog =>
  new InMemoryCardCatalog({
    rows: [],
    metadata: {
      datasetVersion: 'ygoprodeck-test',
      embeddingModel,
      dimensions
    }
  });

const configFor = (overrides: Record<string, string> = {}) =>
  loadConfig({
    OLLAMA_EMBEDDING_MODEL: EMBEDDING_MODEL,
    OLLAMA_EMBEDDING_DIMENSIONS: String(EMBEDDING_DIMENSIONS),
    ...overrides
  });

describe('ensureIndexMatchesConfig', () => {
  it('passes silently when the index matches the configuration', async () => {
    await expect(
      ensureIndexMatchesConfig(catalogWith(), configFor())
    ).resolves.toBeUndefined();
  });

  it('fails when the index was built with a different embedding model', async () => {
    const error = await captureError(
      ensureIndexMatchesConfig(catalogWith('other-embedding:1b'), configFor())
    );

    expect(error).toBeInstanceOf(StaleIndexError);
    expect(error.message).toContain('db:populate');
    expect(error.message).toContain('other-embedding:1b');
  });

  it('fails when the index was built with different dimensions', async () => {
    const error = await captureError(
      ensureIndexMatchesConfig(catalogWith(EMBEDDING_MODEL, 768), configFor())
    );

    expect(error).toBeInstanceOf(StaleIndexError);
    expect(error.message).toContain('db:populate');
  });

  it('passes when the index holds the pinned dataset version', async () => {
    await expect(
      ensureIndexMatchesConfig(
        catalogWith(),
        configFor({ CARD_DATASET_VERSION: 'ygoprodeck-test' })
      )
    ).resolves.toBeUndefined();
  });

  it('fails when the index holds a different dataset version than pinned', async () => {
    const error = await captureError(
      ensureIndexMatchesConfig(
        catalogWith(),
        configFor({ CARD_DATASET_VERSION: 'ygoprodeck-something-else' })
      )
    );

    expect(error).toBeInstanceOf(StaleIndexError);
    expect(error.message).toContain('ygoprodeck-something-else');
    expect(error.message).toContain('db:populate');
  });

  it('fails when there is no index', async () => {
    const error = await captureError(
      ensureIndexMatchesConfig(
        new InMemoryCardCatalog({ rows: [] }),
        configFor()
      )
    );

    expect(error).toBeInstanceOf(StaleIndexError);
    expect(error.message).toContain('db:populate');
  });
});

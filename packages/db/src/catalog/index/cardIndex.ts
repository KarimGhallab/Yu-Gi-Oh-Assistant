import { mkdir } from 'node:fs/promises';

import { connect } from '@lancedb/lancedb';

import type { Card } from '@ygo-assistant/cards';
import type { ILogger } from '@ygo-assistant/logger';
import {
  type IOllamaClient,
  OllamaInvalidResponseError,
  OllamaUnreachableError
} from '@ygo-assistant/ollama';
import { delay } from '@ygo-assistant/utils';

import { composeCardDocument } from '../../ygoprodeck/compose/composeCardDocument.js';
import { CARDS_TABLE } from '../constants.js';
import { createCardArrowSchema } from '../createCardArrowSchema.js';
import { writeIndexMetadata } from '../indexMetadata.js';
import { indexDirectory } from '../indexPaths.js';
import type { BuildCardIndexOptions } from '../types.js';

const DEFAULT_EMBEDDING_BATCH_SIZE = 256;
const EMBEDDING_ATTEMPTS = 3;
const EMBEDDING_RETRY_DELAY_MS = 500;

/**
 * Builds the card index for a data directory. It composes the card documents,
 * embeds them in bounded batches, then replaces any existing index so a rebuild
 * is always a full rebuild.
 */
export async function buildCardIndex(
  options: BuildCardIndexOptions
): Promise<void> {
  const directory = indexDirectory(options.dataDir);
  await mkdir(directory, { recursive: true });

  const documents = options.cards.map(composeCardDocument);
  const vectors = await embedDocuments(
    options.embedder,
    documents,
    options.batchSize ?? DEFAULT_EMBEDDING_BATCH_SIZE,
    options.logger
  );
  if (vectors.length !== options.cards.length) {
    throw new Error(
      `The embedder returned ${vectors.length} vectors for ${options.cards.length} cards`
    );
  }

  const rows = options.cards.map((card, index) =>
    toStoredRow(card, vectors[index])
  );

  const db = await connect(directory);
  await db.createTable(CARDS_TABLE, rows, {
    mode: 'overwrite',
    schema: createCardArrowSchema(options.dimensions)
  });

  await writeIndexMetadata(directory, {
    datasetVersion: options.datasetVersion,
    embeddingModel: options.embeddingModel,
    dimensions: options.dimensions
  });
}

/**
 * Embeds the documents in bounded batches, so a large dump does not become one
 * enormous request, recording each batch as it lands so a long ingestion shows
 * its progress rather than going quiet.
 */
async function embedDocuments(
  embedder: IOllamaClient,
  documents: string[],
  batchSize: number,
  logger: ILogger | undefined
): Promise<number[][]> {
  const vectors: number[][] = [];
  const batches = Math.ceil(documents.length / batchSize);

  for (let batch = 0; batch < batches; batch++) {
    const start = batch * batchSize;
    const slice = documents.slice(start, start + batchSize);
    vectors.push(...(await embedBatch(embedder, slice)));

    logger?.info('Embedded card batch', {
      batch: batch + 1,
      batches,
      embedded: vectors.length,
      total: documents.length
    });
  }

  return vectors;
}

/**
 * Embeds one batch, retrying transient Ollama faults so a single hiccup does
 * not abort a long ingestion. A missing model or a genuinely bad request still
 * fails fast.
 */
async function embedBatch(
  embedder: IOllamaClient,
  batch: string[]
): Promise<number[][]> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= EMBEDDING_ATTEMPTS; attempt++) {
    try {
      return await embedder.embed(batch);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) {
        throw error;
      }
      if (attempt < EMBEDDING_ATTEMPTS) {
        await delay(EMBEDDING_RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError;
}

function isRetryable(error: unknown): boolean {
  return (
    error instanceof OllamaUnreachableError ||
    error instanceof OllamaInvalidResponseError
  );
}

function toStoredRow(card: Card, vector: number[]): Record<string, unknown> {
  return {
    id: card.id,
    name: card.name,
    language: card.language,
    type: card.type,
    frameType: card.frameType,
    typeLine: card.typeLine,
    race: card.race,
    attribute: card.attribute ?? null,
    level: card.level ?? null,
    atk: card.atk ?? null,
    def: card.def ?? null,
    linkVal: card.linkVal ?? null,
    linkMarkers: card.linkMarkers,
    archetype: card.archetype ?? null,
    effect: card.effect,
    imageUrl: card.imageUrl,
    sourceUrl: card.sourceUrl,
    vector
  };
}

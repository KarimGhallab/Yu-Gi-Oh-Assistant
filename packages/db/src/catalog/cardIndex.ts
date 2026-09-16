import { mkdir } from 'node:fs/promises';

import { connect } from '@lancedb/lancedb';

import { type Card, Language } from '@ygo-assistant/cards';
import {
  type IOllamaClient,
  OllamaInvalidResponseError,
  OllamaUnreachableError
} from '@ygo-assistant/ollama';
import { delay } from '@ygo-assistant/utils';

import { composeCardDocument } from '../ygoprodeck/composeCardDocument.js';
import { readIndexMetadata, writeIndexMetadata } from './metadata.js';
import { indexDirectory } from './paths.js';
import { normalizeCard, normalizeCardRow } from './row.js';
import { createCardArrowSchema } from './schema.js';
import type {
  BuildCardIndexOptions,
  CardIndexContents,
  IndexMetadata,
  ScoredCard,
  SearchCardIndexOptions
} from './types.js';

const CARDS_TABLE = 'cards';
const DEFAULT_EMBEDDING_BATCH_SIZE = 256;
const EMBEDDING_ATTEMPTS = 3;
const EMBEDDING_RETRY_DELAY_MS = 500;
const COSINE_DISTANCE_TYPE = 'cosine';
const DISTANCE_COLUMN = '_distance';

const LANGUAGE_PREDICATES: Record<Language, string> = {
  [Language.English]: "language = 'en'",
  [Language.French]: "language = 'fr'"
};

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
    options.batchSize ?? DEFAULT_EMBEDDING_BATCH_SIZE
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
 * Reads the metadata of an index without opening its table.
 */
export function readCardIndexMetadata(dataDir: string): Promise<IndexMetadata> {
  return readIndexMetadata(indexDirectory(dataDir));
}

/**
 * Opens the index and reads its rows, row count, and metadata.
 */
export async function readCardIndex(
  dataDir: string
): Promise<CardIndexContents> {
  const directory = indexDirectory(dataDir);
  const metadata = await readIndexMetadata(directory);
  const db = await connect(directory);
  const table = await db.openTable(CARDS_TABLE);
  const count = await table.countRows();
  const rawRows = await table.query().toArray();

  return {
    rows: rawRows.map(row => normalizeCardRow(row)),
    count,
    metadata
  };
}

/**
 * Searches one language partition by a query vector, returning the nearest
 * cards with their cosine similarity to it, closest first.
 */
export async function searchCardIndex(
  dataDir: string,
  options: SearchCardIndexOptions
): Promise<ScoredCard[]> {
  const directory = indexDirectory(dataDir);
  const db = await connect(directory);
  const table = await db.openTable(CARDS_TABLE);
  const rows = await table
    .query()
    .nearestTo(options.vector)
    .distanceType(COSINE_DISTANCE_TYPE)
    .where(LANGUAGE_PREDICATES[options.language])
    .limit(options.limit)
    .toArray();

  return rows.map(row => ({
    card: normalizeCard(row),
    score: cosineSimilarity(row)
  }));
}

/**
 * LanceDB reports a cosine distance, which runs from 0 for identical vectors to
 * 2 for opposite ones; the application reasons in similarity instead.
 */
function cosineSimilarity(row: Record<string, unknown>): number {
  const distance = row[DISTANCE_COLUMN];
  if (typeof distance !== 'number') {
    throw new Error(
      `The index search did not return a numeric distance: ${String(distance)}`
    );
  }
  return 1 - distance;
}

/**
 * Embeds the documents in bounded batches, so a large dump does not become one
 * enormous request.
 */
async function embedDocuments(
  embedder: IOllamaClient,
  documents: string[],
  batchSize: number
): Promise<number[][]> {
  const vectors: number[][] = [];
  for (let start = 0; start < documents.length; start += batchSize) {
    const batch = documents.slice(start, start + batchSize);
    vectors.push(...(await embedBatch(embedder, batch)));
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

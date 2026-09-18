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
import { buildIdClause, buildWhereClause } from '../cardPredicates.js';
import { createCardArrowSchema } from '../createCardArrowSchema.js';
import { readIndexMetadata, writeIndexMetadata } from '../indexMetadata.js';
import { indexDirectory } from '../indexPaths.js';
import { normalizeCard, normalizeCardRow } from '../normalizeCard.js';
import type {
  BuildCardIndexOptions,
  CardIndexContents,
  CardQueryOptions,
  IndexMetadata,
  ReadCardsByIdsOptions,
  ScoredCard,
  SearchCardIndexOptions
} from '../types.js';

const CARDS_TABLE = 'cards';
const DEFAULT_EMBEDDING_BATCH_SIZE = 256;
const EMBEDDING_ATTEMPTS = 3;
const EMBEDDING_RETRY_DELAY_MS = 500;
const COSINE_DISTANCE_TYPE = 'cosine';
const DISTANCE_COLUMN = '_distance';
const IDENTITY_ORDER = [
  { columnName: 'id', ascending: true },
  { columnName: 'name', ascending: true }
];

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
 * cards with their cosine similarity to it, closest first. Structured filters
 * narrow the partition before the vector search runs.
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
    .where(buildWhereClause(options.language, options.filters ?? []))
    .limit(options.limit)
    .toArray();

  return rows.map(row => ({
    card: normalizeCard(row),
    score: cosineSimilarity(row)
  }));
}

/**
 * Reads the archetypes the index carries, sorted, so a client can offer the ones
 * that are really there rather than a list kept by hand that drifts from the
 * data. A card with no archetype contributes nothing, and a rebuild is what the
 * list follows, since it is read from the index every time.
 */
export async function listCardArchetypes(dataDir: string): Promise<string[]> {
  const directory = indexDirectory(dataDir);
  const db = await connect(directory);
  const table = await db.openTable(CARDS_TABLE);
  const rows = await table.query().select(['archetype']).toArray();

  const archetypes = new Set<string>();
  for (const row of rows) {
    const archetype = row.archetype;
    if (typeof archetype === 'string' && archetype.length > 0) {
      archetypes.add(archetype);
    }
  }

  return [...archetypes].sort();
}

/**
 * Reads the cards of one language partition that match the structured filters,
 * with no vector involved. The rows come back in a stable identity order so a
 * filter-only request is reproducible.
 */
export async function scanCardIndex(
  dataDir: string,
  options: CardQueryOptions
): Promise<Card[]> {
  const directory = indexDirectory(dataDir);
  const db = await connect(directory);
  const table = await db.openTable(CARDS_TABLE);
  const rows = await table
    .query()
    .where(buildWhereClause(options.language, options.filters ?? []))
    .orderBy(IDENTITY_ORDER)
    .limit(options.limit)
    .toArray();

  return rows.map(row => normalizeCard(row));
}

/**
 * Reads specific cards by id, in the order they were asked for. A card the
 * preferred language has comes back in it, and a card it lacks comes back in the
 * language that has it, so a caller never loses a card to the language it
 * happened to ask in. An id no language has is left out, which is the only way a
 * stored card can disappear: the index no longer holds it.
 */
export async function readCardsByIds(
  dataDir: string,
  options: ReadCardsByIdsOptions
): Promise<Card[]> {
  if (options.ids.length === 0) {
    return [];
  }

  const directory = indexDirectory(dataDir);
  const db = await connect(directory);
  const table = await db.openTable(CARDS_TABLE);
  const rows = await table.query().where(buildIdClause(options.ids)).toArray();

  const preferred = new Map<number, Card>();
  const fallback = new Map<number, Card>();
  for (const row of rows) {
    const card = normalizeCard(row);
    const language = card.language === options.language ? preferred : fallback;
    if (!language.has(card.id)) {
      language.set(card.id, card);
    }
  }

  return options.ids.flatMap(id => {
    const card = preferred.get(id) ?? fallback.get(id);
    return card === undefined ? [] : [card];
  });
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

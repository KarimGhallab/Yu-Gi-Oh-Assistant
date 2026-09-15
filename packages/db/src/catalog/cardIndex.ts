import { mkdir } from 'node:fs/promises';

import { connect } from '@lancedb/lancedb';

import type { Card } from '@ygo-assistant/cards';
import type { IOllamaClient } from '@ygo-assistant/ollama';

import { composeCardDocument } from '../ygoprodeck/composeCardDocument.js';
import { readIndexMetadata, writeIndexMetadata } from './metadata.js';
import { indexDirectory } from './paths.js';
import { normalizeCardRow } from './row.js';
import { createCardArrowSchema } from './schema.js';
import type {
  BuildCardIndexOptions,
  CardIndexContents,
  IndexMetadata
} from './types.js';

const CARDS_TABLE = 'cards';
const DEFAULT_EMBEDDING_BATCH_SIZE = 256;

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
    vectors.push(...(await embedder.embed(batch)));
  }
  return vectors;
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

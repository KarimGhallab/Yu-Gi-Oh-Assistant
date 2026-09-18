import type { Card, CardFilters, Language } from '@ygo-assistant/cards';
import type { ILogger } from '@ygo-assistant/logger';
import type { IOllamaClient } from '@ygo-assistant/ollama';

/**
 * The durable description of an index: what it was built from and with. The
 * boot guard compares it against the running configuration.
 */
export interface IndexMetadata {
  datasetVersion: string;
  embeddingModel: string;
  dimensions: number;
}

/**
 * A card as stored in the index: the card fields plus its document vector.
 */
export interface IndexedCardRow extends Card {
  vector: number[];
}

/**
 * Everything the index build needs: the cards, the data directory, and the
 * embedding client.
 */
export interface BuildCardIndexOptions {
  dataDir: string;
  cards: Card[];
  embedder: IOllamaClient;
  embeddingModel: string;
  dimensions: number;
  datasetVersion: string;
  /**
   * How many composed documents to embed per request, bounding the size of a
   * single call when the dump is large.
   */
  batchSize?: number;
  /**
   * Records the embedding progress, batch by batch. A build without one is
   * silent, which is what a test wants.
   */
  logger?: ILogger;
}

/**
 * What reading an index returns.
 */
export interface CardIndexContents {
  rows: IndexedCardRow[];
  count: number;
  metadata: IndexMetadata;
}

/**
 * What every query over the index is scoped by: the language partition to stay
 * inside, the optional structured pre-filters, and how many rows to return.
 */
export interface CardQueryOptions {
  language: Language;
  filters?: CardFilters;
  limit: number;
}

/**
 * A vector search over the index: the query vector on top of the shared query
 * scope.
 */
export interface SearchCardIndexOptions extends CardQueryOptions {
  vector: number[];
}

/**
 * A read of specific cards: which ids to read, and the language to prefer when a
 * card exists in more than one, since the language partitions share their ids.
 */
export interface ReadCardsByIdsOptions {
  ids: number[];
  language: Language;
}

/**
 * A card found by a vector search, with its cosine similarity to the query
 * vector. Higher is closer.
 */
export interface ScoredCard {
  card: Card;
  score: number;
}

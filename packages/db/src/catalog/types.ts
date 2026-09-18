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
 * The read-only view of the card index. It is what every caller above the data
 * layer reaches, so a caller never knows the catalog is LanceDB. Ingestion is
 * not on it: a build replaces the whole table and runs before the server starts.
 */
export interface CardCatalog {
  search(options: {
    vector: number[];
    language: Language;
    filters: CardFilters;
    limit: number;
  }): Promise<ScoredCard[]>;
  scan(options: {
    language: Language;
    filters: CardFilters;
    limit: number;
  }): Promise<Card[]>;
  readByIds(options: { ids: number[]; language: Language }): Promise<Card[]>;
  archetypes(): Promise<string[]>;
  metadata(): Promise<IndexMetadata | undefined>;
}

/**
 * A card found by a vector search, with its cosine similarity to the query
 * vector. Higher is closer.
 */
export interface ScoredCard {
  card: Card;
  score: number;
}

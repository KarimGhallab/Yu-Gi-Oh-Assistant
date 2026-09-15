import type { Card } from '@ygo-assistant/cards';
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
}

/**
 * What reading an index returns.
 */
export interface CardIndexContents {
  rows: IndexedCardRow[];
  count: number;
  metadata: IndexMetadata;
}

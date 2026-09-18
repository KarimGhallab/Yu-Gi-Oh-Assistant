import { Card, CardFilters, Language } from '@ygo-assistant/cards';

import { IndexMetadata, ScoredCard } from './types.js';

export type SearchOptions = {
  vector: number[];
  language: Language;
  filters: CardFilters;
  limit: number;
};

export type ScanOptions = {
  language: Language;
  filters: CardFilters;
  limit: number;
};

export type ReadByIdsOptions = { ids: number[]; language: Language };

/**
 * The read-only view of the card index. It is what every caller above the data
 * layer reaches, so a caller never knows the catalog is LanceDB. Ingestion is
 * not on it: a build replaces the whole table and runs before the server starts.
 */
export interface ICardCatalog {
  search(options: SearchOptions): Promise<ScoredCard[]>;
  scan(options: ScanOptions): Promise<Card[]>;
  readByIds(options: ReadByIdsOptions): Promise<Card[]>;
  archetypes(): Promise<string[]>;
  metadata(): Promise<IndexMetadata | undefined>;
}

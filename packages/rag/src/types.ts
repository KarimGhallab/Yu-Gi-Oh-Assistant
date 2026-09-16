import type { Card, CardFilters, Language } from '@ygo-assistant/cards';
import type { IOllamaClient } from '@ygo-assistant/ollama';

/**
 * What a player is asking for: the free-text intent, the structured filters,
 * and the language partition the search must stay inside. Both the text and the
 * filters are optional, so text alone is a pure semantic search, filters alone
 * are a structured lookup, and together they combine.
 */
export interface RetrievalQuery {
  text?: string;
  filters?: CardFilters;
  language: Language;
}

/**
 * Ranking parameters handed to the engine. They are inputs rather than
 * configuration, so the composition root decides where they come from.
 */
export interface RetrievalRanking {
  topK: number;
  minScore: number;
}

/**
 * A candidate card with its similarity to the request, higher meaning closer. A
 * semantic match carries its cosine similarity; a filter-only match has no
 * distance to report and carries a certain-match score of 1, so the two scales
 * are not directly comparable.
 */
export interface RankedCard {
  card: Card;
  score: number;
}

/**
 * Everything a retrieval needs: where the index lives, how to embed the
 * request, what to look for, and how to rank it.
 */
export interface RetrieveCardsOptions {
  dataDir: string;
  embedder: IOllamaClient;
  query: RetrievalQuery;
  ranking: RetrievalRanking;
}

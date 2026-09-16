import type { Card, Language } from '@ygo-assistant/cards';
import type { IOllamaClient } from '@ygo-assistant/ollama';

/**
 * What a player is asking for: the free-text intent and the language partition
 * the search must stay inside.
 */
export interface RetrievalQuery {
  text: string;
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
 * A candidate card with its similarity to the request. Higher is closer.
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

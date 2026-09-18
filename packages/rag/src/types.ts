import type { Card, CardFilters, Language } from '@ygo-assistant/cards';
import type { CardCatalog } from '@ygo-assistant/db';
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
 * Everything a retrieval needs: the catalog to read, how to embed the request,
 * what to look for, and how to rank it.
 */
export interface RetrieveCardsOptions {
  catalog: CardCatalog;
  embedder: IOllamaClient;
  query: RetrievalQuery;
  ranking: RetrievalRanking;
}

/**
 * Everything a grounded answer needs: the model to ask, the request to answer,
 * the language to answer in, and the only cards the answer may mention.
 */
export interface StreamGroundedAnswerOptions {
  client: IOllamaClient;
  model: string;
  request: string;
  language: Language;
  cards: Card[];
}

/**
 * How a parse ended: the model produced a usable request, or parsing gave up
 * and the player's own words became the free-text query.
 */
export enum ParseOutcome {
  Parsed = 'parsed',
  Degraded = 'degraded'
}

/**
 * A request the model parsed: the constraints it found and the intent to search
 * on. The filters are never absent, an empty set matching every card, and the
 * query is absent when the request carried no free text.
 */
export interface ParsedRequest {
  outcome: ParseOutcome.Parsed;
  filters: CardFilters;
  query?: string;
}

/**
 * A request parsing gave up on: the player's words as the free-text query, so
 * the search still runs degraded rather than erroring.
 */
export interface DegradedRequest {
  outcome: ParseOutcome.Degraded;
  query: string;
}

export type ParseResult = ParsedRequest | DegradedRequest;

/**
 * Everything a parse needs: the model to ask, whether that model can be
 * constrained by a schema, the request to parse, and the language the request
 * and its rewrite are written in.
 */
export interface ParseCardRequestOptions {
  client: IOllamaClient;
  model: string;
  supportsStructuredOutput: boolean;
  request: string;
  language: Language;
}

/**
 * Everything a filter needs: the model to ask, whether that model can be
 * constrained by a schema, the player's own request, and the candidates the
 * search found. The request is deliberately not the text the search ran on: a
 * card has to answer what the player asked for.
 */
export interface FilterCandidatesOptions {
  client: IOllamaClient;
  model: string;
  supportsStructuredOutput: boolean;
  request: string;
  pool: Card[];
}

/**
 * Everything the choice of what to show needs: the search's ranking, how many
 * candidates the model may judge, how many cards may be shown, and whether the
 * model judges at all.
 */
export interface SelectCardsOptions {
  client: IOllamaClient;
  model: string;
  supportsStructuredOutput: boolean;
  request: string;
  ranked: RankedCard[];
  pool: number;
  shown: number;
  filter: boolean;
}

/**
 * What choosing the cards came to: the cards themselves, how many candidates
 * the model was asked about, and whether its judgement failed and left the
 * search's own ranking in place.
 */
export interface CardSelection {
  cards: Card[];
  pool: number;
  fellBack: boolean;
}

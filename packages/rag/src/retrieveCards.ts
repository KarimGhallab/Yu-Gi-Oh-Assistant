import {
  type ScoredCard,
  scanCardIndex,
  searchCardIndex
} from '@ygo-assistant/db';
import type { IOllamaClient } from '@ygo-assistant/ollama';

import type {
  RankedCard,
  RetrievalRanking,
  RetrieveCardsOptions
} from './types.js';

const SINGLE_VECTOR = 1;

/**
 * A filter-only match has no semantic distance to report, so it scores as a
 * certain structural match.
 */
const FILTER_MATCH_SCORE = 1;

/**
 * Retrieves the cards nearest a request. A free-text request is embedded and
 * searched, a filter-only request is looked up directly, and either way the
 * structured filters pre-narrow the language partition, weak matches are
 * dropped, and the survivors are deduplicated by card identity and ordered by
 * score.
 */
export async function retrieveCards(
  options: RetrieveCardsOptions
): Promise<RankedCard[]> {
  const { query, ranking } = options;
  const text = query.text?.trim() ?? '';
  const filters = query.filters ?? [];

  if (text.length === 0) {
    const cards = await scanCardIndex(options.dataDir, {
      language: query.language,
      filters,
      limit: ranking.topK
    });
    return rank(
      cards.map(card => ({ card, score: FILTER_MATCH_SCORE })),
      ranking
    );
  }

  const vector = await embedText(options.embedder, text);
  const scored = await searchCardIndex(options.dataDir, {
    vector,
    language: query.language,
    filters,
    limit: ranking.topK
  });

  return rank(scored, ranking);
}

async function embedText(
  embedder: IOllamaClient,
  text: string
): Promise<number[]> {
  const vectors = await embedder.embed([text]);
  const [vector] = vectors;
  if (vector === undefined || vectors.length !== SINGLE_VECTOR) {
    throw new Error(
      `The embedder returned ${vectors.length} vectors for one request`
    );
  }
  return vector;
}

/**
 * Applies the ranking rules: drop weak matches, keep the best score per card
 * identity, and order the survivors from closest to furthest.
 */
function rank(scored: ScoredCard[], ranking: RetrievalRanking): RankedCard[] {
  const best = new Map<number, RankedCard>();

  for (const { card, score } of scored) {
    if (score < ranking.minScore) {
      continue;
    }
    const current = best.get(card.id);
    if (current === undefined || score > current.score) {
      best.set(card.id, { card, score });
    }
  }

  return [...best.values()].sort((left, right) => right.score - left.score);
}

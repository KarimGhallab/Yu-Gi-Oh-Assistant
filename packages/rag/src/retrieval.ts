import { type ScoredCard, searchCardIndex } from '@ygo-assistant/db';

import type {
  RankedCard,
  RetrievalRanking,
  RetrieveCardsOptions
} from './types.js';

const SINGLE_VECTOR = 1;

/**
 * Retrieves the cards nearest a free-text request: embeds the text, searches the
 * active language partition for the best candidates, drops anything below the
 * similarity floor, then returns them deduplicated by card identity and ordered
 * by score.
 */
export async function retrieveCards(
  options: RetrieveCardsOptions
): Promise<RankedCard[]> {
  const vector = await embedQuery(options);
  const scored = await searchCardIndex(options.dataDir, {
    vector,
    language: options.query.language,
    limit: options.ranking.topK
  });

  return rank(scored, options.ranking);
}

async function embedQuery(options: RetrieveCardsOptions): Promise<number[]> {
  const vectors = await options.embedder.embed([options.query.text]);
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

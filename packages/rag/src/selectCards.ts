import { filterCandidates } from './filter/filterCandidates.js';
import type { CardSelection, SelectCardsOptions } from './types.js';

/**
 * The cards a turn shows: the strongest of what the search found, judged by the
 * model when it is asked to judge.
 *
 * The pool is what the model is asked about, and only its top is offered, so a
 * judgement is never made over more candidates than a local model reads well.
 * A judgement that fails is not a failure of the turn, and neither is one that
 * keeps nothing: the first falls back to the search's own ranking, and the
 * second is how a search that found nothing relevant is reported.
 */
export async function selectCards(
  options: SelectCardsOptions
): Promise<CardSelection> {
  const ranked = options.ranked.map(rankedCard => rankedCard.card);
  const fallback = ranked.slice(0, options.shown);

  if (!options.filter) {
    return { cards: fallback, pool: 0, fellBack: false };
  }

  const pool = ranked.slice(0, options.pool);

  // A search that found nothing has nothing to judge: asking anyway would spend
  // a model call to be told what is already known.
  if (pool.length === 0) {
    return { cards: [], pool: 0, fellBack: false };
  }

  let kept: CardSelection['cards'];
  try {
    kept = await filterCandidates({
      client: options.client,
      model: options.model,
      supportsStructuredOutput: options.supportsStructuredOutput,
      request: options.request,
      pool
    });
  } catch {
    return { cards: fallback, pool: pool.length, fellBack: true };
  }

  return {
    cards: kept.slice(0, options.shown),
    pool: pool.length,
    fellBack: false
  };
}

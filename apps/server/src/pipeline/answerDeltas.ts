import {
  type Card,
  type CardFilters,
  Language,
  cardFilterFieldName
} from '@ygo-assistant/cards';
import { streamGroundedAnswer } from '@ygo-assistant/rag';

import type { OllamaDependencies } from '../server/types.js';

/**
 * What the pipeline says when the search found nothing. The copy is a product
 * decision rather than something a model should be left to improvise, so it is
 * written for each language the catalog is indexed in instead of being
 * translated by the machine: a model asked to say it found nothing can say
 * something else instead, and a sentence a player reads is worth reviewing in
 * the language it is read in.
 *
 * A search that carried filters names the fields that constrained it and points
 * at the readout below, because "broaden it" is not something a player can act
 * on. A search that ran on the player's own words says so, because there is no
 * filter to remove.
 */
const NO_CARDS_ANSWERS: Record<Language, (fields: string[]) => string> = {
  [Language.English]: fields =>
    fields.length === 0
      ? 'No card matched. The search ran on your own words, so try different words.'
      : `No card matched every filter: ${fields.join(', ')}. Remove one from the filters below and ask again.`,
  [Language.French]: fields =>
    fields.length === 0
      ? 'Aucune carte ne correspond. La recherche a porté sur vos propres mots ; essayez d’autres mots.'
      : `Aucune carte ne correspond à tous ces filtres : ${fields.join(', ')}. Retirez-en un dans les filtres ci-dessous et relancez la recherche.`
};

/**
 * The fields a search constrained itself with, in the language the answer is
 * read in, each one named once however many filters ask about it.
 */
function fieldNames(language: Language, filters: CardFilters): string[] {
  return [
    ...new Set(
      filters.map(filter => cardFilterFieldName(filter.field, language))
    )
  ];
}

/**
 * The prose a pipeline streams. A search that found nothing is answered without
 * the model: the reply is known before the answer stage would run, and a model
 * asked to say it found nothing can say something else instead.
 */
export function answerDeltas(
  dependencies: OllamaDependencies,
  model: string,
  request: string,
  language: Language,
  cards: Card[],
  filters: CardFilters
): AsyncIterable<string> {
  if (cards.length === 0) {
    return once(NO_CARDS_ANSWERS[language](fieldNames(language, filters)));
  }

  return streamGroundedAnswer({
    client: dependencies.ollama,
    model,
    request,
    language,
    cards
  });
}

async function* once(text: string): AsyncGenerator<string> {
  yield text;
}

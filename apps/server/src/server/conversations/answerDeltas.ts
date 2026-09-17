import { type Card, Language } from '@ygo-assistant/cards';
import { streamGroundedAnswer } from '@ygo-assistant/rag';

import type { OllamaDependencies } from '../types.js';

/**
 * What the turn says when the search found nothing. The copy is a product
 * decision rather than something a model should be left to improvise, so it is
 * written for each language the catalog is indexed in instead of being
 * translated by the machine: a model asked to say it found nothing can say
 * something else instead, and a sentence a player reads is worth reviewing in
 * the language it is read in.
 */
const NO_CARDS_ANSWERS: Record<Language, string> = {
  [Language.English]:
    'I could not find a card that matches that request. Try broadening it.',
  [Language.French]:
    'Je n’ai trouvé aucune carte qui corresponde à cette demande. Essayez d’élargir votre recherche.'
};

/**
 * The prose a turn streams. A search that found nothing is answered without the
 * model: the reply is known before the answer stage would run, and a model
 * asked to say it found nothing can say something else instead.
 */
export function answerDeltas(
  dependencies: OllamaDependencies,
  model: string,
  request: string,
  language: Language,
  cards: Card[]
): AsyncIterable<string> {
  if (cards.length === 0) {
    return once(NO_CARDS_ANSWERS[language]);
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

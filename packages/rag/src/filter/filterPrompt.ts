import type { Card } from '@ygo-assistant/cards';

import { CARD_DATA_RULE, asCardData, frameCardData } from '../cardData.js';

/**
 * The instruction a filtering model is given: the cards a search found, in the
 * order it ranked them, and what to do with them. The request itself is the
 * user turn that follows, because what a card has to answer is what the player
 * asked, not the text the search was rewritten into.
 *
 * The cards carry their id, name, type and effect. The id is what the answer is
 * made of, and the effect is what the judgement is made on. Their text is
 * untrusted card data, so it sits in a labelled block and is flattened to one
 * line per card and stripped of anything that could forge the block's
 * delimiters.
 */
export function buildFilterPrompt(cards: Card[]): string {
  return [
    'You choose which of the Yu-Gi-Oh cards a search found really answer a player request.',
    '',
    CARD_DATA_RULE,
    'The cards the search found, in the order it ranked them:',
    frameCardData(cards.map(describeCandidate)),
    '',
    'Keep the ids of the cards that answer the request that follows, and leave out every card that does not, however high the search ranked it. A request about one kind of card is not answered by a card of another kind, and a card that is merely near the words is not an answer.',
    '',
    'Answer with an empty list when none of the cards answer the request. Answer with JSON only, in this shape:',
    '{"keep": [46986414, 89631139]}'
  ].join('\n');
}

function describeCandidate(card: Card): string {
  return `- ${card.id}: ${asCardData(card.name)} (${asCardData(
    card.type
  )}) ${asCardData(card.effect)}`;
}

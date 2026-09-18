import type { Card, Language } from '@ygo-assistant/cards';
import type { Message as StoredMessage } from '@ygo-assistant/db';

import type { ServerDependencies } from '../types.js';

/**
 * A message as the API represents it: what was said, and what the turn behind it
 * was searched with and suggested. A stored turn keeps the ids of the cards it
 * showed rather than the cards themselves, so the two are not the same shape.
 * The reply's search is the record the turn stored, carried through as it is.
 */
export interface ProjectedMessage extends Omit<StoredMessage, 'cardIds'> {
  cards?: Card[];
}

/**
 * Turns the stored messages of a conversation into the ones the API answers
 * with, resolving the ids of every suggested card in one read of the index. The
 * cards come back in the language the conversation is in, in the order the turn
 * ranked them, and a card the index no longer holds is left out rather than
 * failing the whole conversation.
 */
export async function projectMessages(
  dependencies: ServerDependencies,
  language: Language,
  messages: StoredMessage[]
): Promise<ProjectedMessage[]> {
  const cards = await dependencies.catalog.readByIds({
    ids: messages.flatMap(message => message.cardIds ?? []),
    language
  });
  const cardsById = new Map<number, Card>(cards.map(card => [card.id, card]));

  return messages.map(message => {
    const { cardIds, ...stored } = message;

    if (cardIds === undefined) {
      return stored;
    }

    return {
      ...stored,
      cards: cardIds.flatMap(id => cardsById.get(id) ?? [])
    };
  });
}

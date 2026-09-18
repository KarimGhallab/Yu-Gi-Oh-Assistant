import type { Card } from '@ygo-assistant/cards';

/**
 * Builds the semantic text embedded for a card: its name, its archetype when it
 * has one, and its effect. The structured fields retrieval can filter on are
 * left out on purpose, so the vector carries what a card is called and what it
 * does rather than a shared attribute or race that would pull every card of
 * that kind together.
 */
export function composeCardDocument(card: Card): string {
  const lines = [card.name];

  if (card.archetype !== undefined) {
    lines.push(`Archetype: ${card.archetype}`);
  }
  lines.push(normalizeText(card.effect));

  return lines.join('\n');
}

function normalizeText(text: string): string {
  return text.replace(/\r\n?/g, '\n').trim();
}

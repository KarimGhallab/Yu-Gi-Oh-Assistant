import type { Card } from '@ygo-assistant/cards';

/**
 * Builds the semantic text embedded for a card. It carries the name, type line,
 * attribute, race, level, link data, stats, and effect, so the vector blends
 * what the card is with what it does.
 */
export function composeCardDocument(card: Card): string {
  const lines = [card.name, `Type: ${typeLineOf(card)}`];

  if (card.attribute !== undefined) {
    lines.push(`Attribute: ${card.attribute}`);
  }
  lines.push(`Race: ${card.race}`);
  if (card.level !== undefined) {
    lines.push(`Level: ${card.level}`);
  }
  if (card.linkVal !== undefined) {
    lines.push(`Link Rating: ${card.linkVal}`);
  }
  if (card.linkMarkers.length > 0) {
    lines.push(`Link Markers: ${card.linkMarkers.join(', ')}`);
  }
  if (card.atk !== undefined) {
    lines.push(`ATK: ${card.atk}`);
  }
  if (card.def !== undefined) {
    lines.push(`DEF: ${card.def}`);
  }
  lines.push(`Effect: ${normalizeText(card.effect)}`);

  return lines.join('\n');
}

function typeLineOf(card: Card): string {
  return card.typeLine.length > 0 ? card.typeLine.join(' / ') : card.type;
}

function normalizeText(text: string): string {
  return text.replace(/\r\n?/g, '\n').trim();
}

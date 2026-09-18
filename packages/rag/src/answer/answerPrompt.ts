import { type Card, Language } from '@ygo-assistant/cards';

import { languageName } from '../languageName.js';

/**
 * The instruction a grounded answer is written from: the only cards the answer
 * may mention, each with the facts that let the model explain why it matches.
 * The cards are the candidate payload, so an answer cannot reference a card the
 * search did not return.
 */
export function buildAnswerPrompt(cards: Card[], language: Language): string {
  return [
    'You recommend Yu-Gi-Oh cards to a player, using only the cards listed below.',
    '',
    'The cards the search found:',
    ...cards.map(describeCard),
    '',
    `Answer the request that follows in ${languageName(language)}. Mention no card that is not listed above, and say why each card you recommend matches the request.`,
    '',
    'Write it in Markdown, and no more of it than this: paragraphs, **bold** around a card name, *italic* for emphasis, and a bullet list when you recommend several cards. Use no headings, no code, no tables, no images, and no links: the cards are already listed with their links under your answer.'
  ].join('\n');
}

function describeCard(card: Card): string {
  return `- ${card.name} (${describeFacts(card)}): ${card.effect}`;
}

/**
 * The traits a card carries. A card kind that has no level, stats, or attribute
 * simply does not mention them, so the model never reads a zero it would take
 * for a fact.
 */
function describeFacts(card: Card): string {
  const facts = [card.type, card.race];

  if (card.attribute !== undefined) {
    facts.push(card.attribute);
  }
  if (card.level !== undefined) {
    facts.push(`Level ${card.level}`);
  }
  if (card.atk !== undefined) {
    facts.push(`ATK ${card.atk}`);
  }
  if (card.def !== undefined) {
    facts.push(`DEF ${card.def}`);
  }
  if (card.linkVal !== undefined) {
    facts.push(`Link ${card.linkVal}`);
  }

  return facts.join(', ');
}

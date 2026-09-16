import { type Card, CardType, type Language } from '@ygo-assistant/cards';

import { type YgoProdeckCard, cardInfoResponseSchema } from './schemas.js';

/**
 * Card types that are not real, suggestable cards.
 */
const NON_SUGGESTABLE_TYPES: ReadonlySet<CardType> = new Set([
  CardType.Token,
  CardType.SkillCard
]);

/**
 * Validates a YGOPRODeck card dump and converts it to card records for one
 * language, dropping cards that are not suggestable.
 */
export function convertCardInfoResponse(
  payload: unknown,
  language: Language
): Card[] {
  const response = cardInfoResponseSchema.parse(payload);
  return convertCards(response.data, language);
}

/**
 * Converts already-validated raw cards to card records for one language.
 */
export function convertCards(
  rawCards: YgoProdeckCard[],
  language: Language
): Card[] {
  const cards: Card[] = [];
  for (const raw of rawCards) {
    const card = convertCard(raw, language);
    if (card !== undefined) {
      cards.push(card);
    }
  }
  return cards;
}

function convertCard(
  raw: YgoProdeckCard,
  language: Language
): Card | undefined {
  if (NON_SUGGESTABLE_TYPES.has(raw.type)) {
    return undefined;
  }

  return {
    id: raw.id,
    name: raw.name,
    language,
    type: raw.type,
    frameType: raw.frameType,
    typeLine: raw.typeline ?? [],
    race: raw.race,
    attribute: raw.attribute ?? undefined,
    level: toLevel(raw.level),
    atk: raw.atk ?? undefined,
    def: raw.def ?? undefined,
    linkVal: raw.linkval ?? undefined,
    linkMarkers: raw.linkmarkers ?? [],
    archetype: raw.archetype ?? undefined,
    effect: raw.desc,
    imageUrl: raw.card_images[0].image_url,
    sourceUrl: raw.ygoprodeck_url
  };
}

/**
 * Link monsters report a level of zero, which is not a real level.
 */
function toLevel(value: number | null | undefined): number | undefined {
  return value !== null && value !== undefined && value > 0 ? value : undefined;
}

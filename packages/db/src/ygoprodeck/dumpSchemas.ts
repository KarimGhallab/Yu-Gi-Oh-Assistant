import { z } from 'zod';

import {
  CardAttribute,
  CardType,
  FrameType,
  LinkMarker
} from '@ygo-assistant/cards';

/**
 * The bounds a card field may not cross. The real dump is far inside them; the
 * bounds are what keeps a poisoned or broken response from storing a field the
 * rest of the application would have to carry.
 */
const MAX_NAME_LENGTH = 300;
const MAX_EFFECT_LENGTH = 20_000;
const MAX_RACE_LENGTH = 100;
const MAX_TYPE_LINE_ENTRY_LENGTH = 100;
const MAX_TYPE_LINE_ENTRIES = 10;
const MAX_ARCHETYPE_LENGTH = 200;

/** The only hosts a card's own URLs may point at. */
const APPROVED_LINK_HOSTS: ReadonlySet<string> = new Set([
  'ygoprodeck.com',
  'images.ygoprodeck.com'
]);

/**
 * A card URL must be `https` on the source's own host. The client renders
 * whatever the catalog stores, so a scheme or a host the source does not own is
 * refused at the boundary rather than trusted downstream.
 */
const cardUrlSchema = z.string().min(1).refine(isApprovedCardUrl, {
  message: 'The URL must be an https URL on ygoprodeck.com'
});

function isApprovedCardUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && APPROVED_LINK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

const cardImageSchema = z.object({
  image_url: cardUrlSchema
});

/**
 * The subset of a YGOPRODeck card the catalog needs. Fields a card kind does
 * not have are sent as `null` rather than omitted, so they are nullish here;
 * the enum fields are validated so an upstream change is caught rather than
 * stored as free text, and the free-text fields are bounded.
 */
const ygoProdeckCardSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  desc: z.string().max(MAX_EFFECT_LENGTH),
  typeline: z
    .array(z.string().max(MAX_TYPE_LINE_ENTRY_LENGTH))
    .max(MAX_TYPE_LINE_ENTRIES)
    .nullish(),
  type: z.enum(CardType),
  frameType: z.enum(FrameType),
  race: z.string().max(MAX_RACE_LENGTH),
  attribute: z.enum(CardAttribute).nullish(),
  level: z.number().nullish(),
  atk: z.number().nullish(),
  def: z.number().nullish(),
  linkval: z.number().nullish(),
  linkmarkers: z.array(z.enum(LinkMarker)).nullish(),
  archetype: z.string().max(MAX_ARCHETYPE_LENGTH).nullish(),
  ygoprodeck_url: cardUrlSchema,
  card_images: z.array(cardImageSchema).min(1)
});

/**
 * The response of `GET /api/v7/cardinfo.php`, narrowed to the fields used.
 */
export const cardInfoResponseSchema = z.object({
  data: z.array(ygoProdeckCardSchema)
});

export type YgoProdeckCard = z.infer<typeof ygoProdeckCardSchema>;

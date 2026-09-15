import { z } from 'zod';

import {
  CardAttribute,
  CardType,
  FrameType,
  LinkMarker
} from '@ygo-assistant/cards';

const cardImageSchema = z.object({
  image_url: z.string().min(1)
});

/**
 * The subset of a YGOPRODeck card the catalog needs. Fields a card kind does
 * not have are sent as `null` rather than omitted, so they are nullish here;
 * the enum fields are validated so an upstream change is caught rather than
 * stored as free text.
 */
const ygoProdeckCardSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  desc: z.string(),
  typeline: z.array(z.string()).nullish(),
  type: z.enum(CardType),
  frameType: z.enum(FrameType),
  race: z.string(),
  attribute: z.enum(CardAttribute).nullish(),
  level: z.number().nullish(),
  atk: z.number().nullish(),
  def: z.number().nullish(),
  linkval: z.number().nullish(),
  linkmarkers: z.array(z.enum(LinkMarker)).nullish(),
  archetype: z.string().nullish(),
  ygoprodeck_url: z.string().min(1),
  card_images: z.array(cardImageSchema).min(1)
});

/**
 * The response of `GET /api/v7/cardinfo.php`, narrowed to the fields used.
 */
export const cardInfoResponseSchema = z.object({
  data: z.array(ygoProdeckCardSchema)
});

export type YgoProdeckCard = z.infer<typeof ygoProdeckCardSchema>;

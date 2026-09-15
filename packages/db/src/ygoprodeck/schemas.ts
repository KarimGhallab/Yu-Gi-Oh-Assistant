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
 * The subset of a YGOPRODeck card the catalog needs. Fields a card kind omits
 * are optional here, and the enum fields are validated so an upstream change is
 * caught rather than stored as free text.
 */
const ygoProdeckCardSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  desc: z.string(),
  typeline: z.array(z.string()).optional(),
  type: z.enum(CardType),
  frameType: z.enum(FrameType),
  race: z.string().min(1),
  attribute: z.enum(CardAttribute).optional(),
  level: z.number().optional(),
  atk: z.number().optional(),
  def: z.number().nullable().optional(),
  linkval: z.number().optional(),
  linkmarkers: z.array(z.enum(LinkMarker)).optional(),
  archetype: z.string().optional(),
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

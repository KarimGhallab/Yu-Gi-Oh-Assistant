import { z } from 'zod';

import {
  CardAttribute,
  CardType,
  FrameType,
  Language,
  LinkMarker
} from '../enums.js';

/**
 * One card, in one language, as stored in the local catalog and as it travels
 * over the wire. Fields the source omits for a card kind (attribute, level,
 * stats) are absent rather than zero. This is the domain's own shape, so the
 * card type is derived from it and the two cannot drift apart.
 */
export const cardSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  language: z.enum(Language),
  type: z.enum(CardType),
  frameType: z.enum(FrameType),
  typeLine: z.array(z.string()),
  race: z.string(),
  attribute: z.enum(CardAttribute).optional(),
  level: z.number().int().optional(),
  atk: z.number().int().optional(),
  def: z.number().int().optional(),
  linkVal: z.number().int().optional(),
  linkMarkers: z.array(z.enum(LinkMarker)),
  archetype: z.string().optional(),
  effect: z.string(),
  imageUrl: z.string(),
  sourceUrl: z.string()
});

export type Card = z.infer<typeof cardSchema>;

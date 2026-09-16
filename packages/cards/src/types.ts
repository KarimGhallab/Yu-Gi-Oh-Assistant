import type {
  CardAttribute,
  CardType,
  FrameType,
  Language,
  LinkMarker
} from './enums.js';

/**
 * One card, in one language, as stored in the local catalog. Fields the source
 * omits for a card kind (attribute, level, stats) are absent rather than zero.
 */
export interface Card {
  id: number;
  name: string;
  language: Language;
  type: CardType;
  frameType: FrameType;
  typeLine: string[];
  race: string;
  attribute?: CardAttribute;
  level?: number;
  atk?: number;
  def?: number;
  linkVal?: number;
  linkMarkers: LinkMarker[];
  archetype?: string;
  effect: string;
  imageUrl: string;
  sourceUrl: string;
}

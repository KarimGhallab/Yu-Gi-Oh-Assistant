import {
  type Card,
  CardAttribute,
  CardType,
  FrameType,
  Language,
  LinkMarker
} from '@ygo-assistant/cards';

import { createStoredValueReader, enumGuard } from '../storedValue.js';
import type { IndexedCardRow } from './types.js';

const LANGUAGES = new Set<string>(Object.values(Language));
const CARD_TYPES = new Set<string>(Object.values(CardType));
const FRAME_TYPES = new Set<string>(Object.values(FrameType));
const CARD_ATTRIBUTES = new Set<string>(Object.values(CardAttribute));
const LINK_MARKERS = new Set<string>(Object.values(LinkMarker));

const isLanguage = enumGuard<Language>(LANGUAGES);
const isCardType = enumGuard<CardType>(CARD_TYPES);
const isFrameType = enumGuard<FrameType>(FRAME_TYPES);
const isCardAttribute = enumGuard<CardAttribute>(CARD_ATTRIBUTES);
const isLinkMarker = enumGuard<LinkMarker>(LINK_MARKERS);

/**
 * The card index's rows, read through the reader bound to it. LanceDB returns
 * list columns as Arrow vectors, nullable columns as null, and enum columns as
 * plain strings, so this is where a stored row becomes a domain card again.
 */
const index = createStoredValueReader('the card index');

/**
 * Turns a row read back from LanceDB into a typed card.
 */
export function normalizeCard(row: Record<string, unknown>): Card {
  return {
    id: index.toNumber(row.id, 'id'),
    name: index.toString(row.name, 'name'),
    language: index.toEnum(row.language, isLanguage, 'language'),
    type: index.toEnum(row.type, isCardType, 'type'),
    frameType: index.toEnum(row.frameType, isFrameType, 'frameType'),
    typeLine: index.toStringArray(row.typeLine, 'typeLine'),
    race: index.toString(row.race, 'race'),
    attribute: index.toOptionalEnum(
      row.attribute,
      isCardAttribute,
      'attribute'
    ),
    level: index.toOptionalNumber(row.level, 'level'),
    atk: index.toOptionalNumber(row.atk, 'atk'),
    def: index.toOptionalNumber(row.def, 'def'),
    linkVal: index.toOptionalNumber(row.linkVal, 'linkVal'),
    linkMarkers: index
      .toStringArray(row.linkMarkers, 'linkMarkers')
      .map(marker => index.toEnum(marker, isLinkMarker, 'linkMarkers')),
    archetype: index.toOptionalString(row.archetype, 'archetype'),
    effect: index.toString(row.effect, 'effect'),
    imageUrl: index.toString(row.imageUrl, 'imageUrl'),
    sourceUrl: index.toString(row.sourceUrl, 'sourceUrl')
  };
}

/**
 * Turns a row read back from LanceDB into a typed card row: the card fields
 * plus the composed-document vector.
 */
export function normalizeCardRow(row: Record<string, unknown>): IndexedCardRow {
  return {
    ...normalizeCard(row),
    vector: index.toNumberArray(row.vector, 'vector')
  };
}

/**
 * Reads the archetype cell of a row for the list of archetypes. An absent or
 * empty cell contributes nothing; a cell that is not a string means the index is
 * corrupt, so the read raises.
 */
export function toArchetype(value: unknown): string | undefined {
  const archetype = index.toOptionalString(value, 'archetype');

  return archetype !== undefined && archetype.length > 0
    ? archetype
    : undefined;
}

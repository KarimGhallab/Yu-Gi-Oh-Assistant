import {
  CardAttribute,
  CardType,
  FrameType,
  Language,
  LinkMarker
} from '@ygo-assistant/cards';

import type { IndexedCardRow } from './types.js';

const LANGUAGES = new Set<string>(Object.values(Language));
const CARD_TYPES = new Set<string>(Object.values(CardType));
const FRAME_TYPES = new Set<string>(Object.values(FrameType));
const CARD_ATTRIBUTES = new Set<string>(Object.values(CardAttribute));
const LINK_MARKERS = new Set<string>(Object.values(LinkMarker));

/**
 * Turns a row read back from LanceDB into a typed card row. LanceDB returns
 * list columns as Arrow vectors, nullable columns as null, and enum columns as
 * plain strings, so this is where a stored row becomes a domain row again.
 */
export function normalizeCardRow(row: Record<string, unknown>): IndexedCardRow {
  return {
    id: toNumber(row.id, 'id'),
    name: toString(row.name, 'name'),
    language: toLanguage(row.language),
    type: toCardType(row.type),
    frameType: toFrameType(row.frameType),
    typeLine: toStringArray(row.typeLine, 'typeLine'),
    race: toString(row.race, 'race'),
    attribute: toOptionalCardAttribute(row.attribute),
    level: toOptionalNumber(row.level),
    atk: toOptionalNumber(row.atk),
    def: toOptionalNumber(row.def),
    linkVal: toOptionalNumber(row.linkVal),
    linkMarkers: toStringArray(row.linkMarkers, 'linkMarkers').map(
      toLinkMarker
    ),
    archetype: toOptionalString(row.archetype),
    effect: toString(row.effect, 'effect'),
    imageUrl: toString(row.imageUrl, 'imageUrl'),
    sourceUrl: toString(row.sourceUrl, 'sourceUrl'),
    vector: toNumberArray(row.vector, 'vector')
  };
}

const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && LANGUAGES.has(value);

const isCardType = (value: unknown): value is CardType =>
  typeof value === 'string' && CARD_TYPES.has(value);

const isFrameType = (value: unknown): value is FrameType =>
  typeof value === 'string' && FRAME_TYPES.has(value);

const isCardAttribute = (value: unknown): value is CardAttribute =>
  typeof value === 'string' && CARD_ATTRIBUTES.has(value);

const isLinkMarker = (value: unknown): value is LinkMarker =>
  typeof value === 'string' && LINK_MARKERS.has(value);

const isIterable = (value: unknown): value is Iterable<unknown> =>
  value !== null && typeof value === 'object' && Symbol.iterator in value;

function toLanguage(value: unknown): Language {
  if (isLanguage(value)) {
    return value;
  }
  throw unexpected('language', value);
}

function toCardType(value: unknown): CardType {
  if (isCardType(value)) {
    return value;
  }
  throw unexpected('type', value);
}

function toFrameType(value: unknown): FrameType {
  if (isFrameType(value)) {
    return value;
  }
  throw unexpected('frameType', value);
}

function toLinkMarker(value: string): LinkMarker {
  if (isLinkMarker(value)) {
    return value;
  }
  throw unexpected('linkMarkers', value);
}

function toOptionalCardAttribute(value: unknown): CardAttribute | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (isCardAttribute(value)) {
    return value;
  }
  throw unexpected('attribute', value);
}

function toString(value: unknown, field: string): string {
  if (typeof value === 'string') {
    return value;
  }
  throw unexpected(field, value);
}

function toOptionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  throw unexpected('string', value);
}

function toNumber(value: unknown, field: string): number {
  if (typeof value === 'number') {
    return value;
  }
  throw unexpected(field, value);
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'number') {
    return value;
  }
  throw unexpected('number', value);
}

function toStringArray(value: unknown, field: string): string[] {
  return toList(value, field).map(item => toString(item, field));
}

function toNumberArray(value: unknown, field: string): number[] {
  return toList(value, field).map(item => toNumber(item, field));
}

function toList(value: unknown, field: string): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (isIterable(value)) {
    return Array.from(value);
  }
  throw unexpected(field, value);
}

function unexpected(field: string, value: unknown): Error {
  return new Error(
    `Unexpected value for "${field}" in the card index: ${String(value)}`
  );
}

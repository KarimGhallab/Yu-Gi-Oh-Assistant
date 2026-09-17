import { z } from 'zod';

import type { Card } from '../card/schema.js';
import { CardAttribute, CardType, FrameType, LinkMarker } from '../enums.js';

/**
 * Card fields a structured filter can constrain. The set is the vocabulary
 * shared by parsing, retrieval, and the UI, so nothing may filter on a field
 * the index does not carry.
 */
export enum CardFilterField {
  Type = 'type',
  FrameType = 'frameType',
  Race = 'race',
  Attribute = 'attribute',
  Level = 'level',
  Atk = 'atk',
  Def = 'def',
  LinkVal = 'linkVal',
  LinkMarkers = 'linkMarkers',
  Archetype = 'archetype'
}

/**
 * Comparison a structured filter applies to a card field. Which operators fit a
 * field depends on whether the field is numeric, textual, or enumerated.
 */
export enum FilterOperator {
  Eq = 'eq',
  Ne = 'ne',
  Gt = 'gt',
  Gte = 'gte',
  Lt = 'lt',
  Lte = 'lte',
  Contains = 'contains',
  StartsWith = 'startsWith',
  EndsWith = 'endsWith'
}

const COMPARISON_OPERATORS = [
  FilterOperator.Eq,
  FilterOperator.Ne,
  FilterOperator.Gt,
  FilterOperator.Gte,
  FilterOperator.Lt,
  FilterOperator.Lte
] as const;

const TEXT_OPERATORS = [
  FilterOperator.Eq,
  FilterOperator.Ne,
  FilterOperator.Contains,
  FilterOperator.StartsWith,
  FilterOperator.EndsWith
] as const;

const EQUALITY_OPERATORS = [FilterOperator.Eq, FilterOperator.Ne] as const;

const comparisonOperatorSchema = z.enum(COMPARISON_OPERATORS);
const textOperatorSchema = z.enum(TEXT_OPERATORS);
const equalityOperatorSchema = z.enum(EQUALITY_OPERATORS);

/**
 * One structured constraint on a card field: the field, the operator that fits
 * it, and a value of the field's kind. Validated at the boundary so that
 * retrieval never receives a filter the index cannot honor. A single
 * discriminated union keeps the rejection error precise about the offending
 * field, and keeps the schema flat enough to derive a prompt-ready JSON schema
 * from.
 */
export const cardFilterSchema = z.discriminatedUnion('field', [
  z.object({
    field: z.literal(CardFilterField.Level),
    operator: comparisonOperatorSchema,
    value: z.number().int()
  }),
  z.object({
    field: z.literal(CardFilterField.Atk),
    operator: comparisonOperatorSchema,
    value: z.number().int()
  }),
  z.object({
    field: z.literal(CardFilterField.Def),
    operator: comparisonOperatorSchema,
    value: z.number().int()
  }),
  z.object({
    field: z.literal(CardFilterField.LinkVal),
    operator: comparisonOperatorSchema,
    value: z.number().int()
  }),
  z.object({
    field: z.literal(CardFilterField.Race),
    operator: textOperatorSchema,
    value: z.string().min(1)
  }),
  z.object({
    field: z.literal(CardFilterField.Archetype),
    operator: textOperatorSchema,
    value: z.string().min(1)
  }),
  z.object({
    field: z.literal(CardFilterField.Type),
    operator: equalityOperatorSchema,
    value: z.enum(CardType)
  }),
  z.object({
    field: z.literal(CardFilterField.FrameType),
    operator: equalityOperatorSchema,
    value: z.enum(FrameType)
  }),
  z.object({
    field: z.literal(CardFilterField.Attribute),
    operator: equalityOperatorSchema,
    value: z.enum(CardAttribute)
  }),
  z.object({
    field: z.literal(CardFilterField.LinkMarkers),
    operator: z.literal(FilterOperator.Contains),
    value: z.enum(LinkMarker)
  })
]);

/**
 * A set of card filters, combined with AND. An empty set matches every card.
 */
export const cardFiltersSchema = z.array(cardFilterSchema);

export type CardFilter = z.infer<typeof cardFilterSchema>;

export type CardFilters = z.infer<typeof cardFiltersSchema>;

export type EqualityOperator = (typeof EQUALITY_OPERATORS)[number];

export type ComparisonOperator = (typeof COMPARISON_OPERATORS)[number];

export type TextOperator = (typeof TEXT_OPERATORS)[number];

type Comparison<Value> = (value: Value, expected: Value) => boolean;

const NUMERIC_COMPARISONS: Record<ComparisonOperator, Comparison<number>> = {
  [FilterOperator.Eq]: (value, expected) => value === expected,
  [FilterOperator.Ne]: (value, expected) => value !== expected,
  [FilterOperator.Gt]: (value, expected) => value > expected,
  [FilterOperator.Gte]: (value, expected) => value >= expected,
  [FilterOperator.Lt]: (value, expected) => value < expected,
  [FilterOperator.Lte]: (value, expected) => value <= expected
};

const TEXT_COMPARISONS: Record<TextOperator, Comparison<string>> = {
  [FilterOperator.Eq]: (value, expected) =>
    toComparable(value) === toComparable(expected),
  [FilterOperator.Ne]: (value, expected) =>
    toComparable(value) !== toComparable(expected),
  [FilterOperator.Contains]: (value, expected) =>
    toComparable(value).includes(toComparable(expected)),
  [FilterOperator.StartsWith]: (value, expected) =>
    toComparable(value).startsWith(toComparable(expected)),
  [FilterOperator.EndsWith]: (value, expected) =>
    toComparable(value).endsWith(toComparable(expected))
};

const EQUALITY_COMPARISONS: Record<EqualityOperator, Comparison<string>> = {
  [FilterOperator.Eq]: (value, expected) => value === expected,
  [FilterOperator.Ne]: (value, expected) => value !== expected
};

/**
 * Applies the composition rule that governs every filter set: the filters are
 * AND-combined, so all of them must hold, and an empty set holds for every
 * card. Text fields compare case-insensitively, and a filter on a field the
 * card does not carry never holds.
 */
export function cardMatchesFilters(card: Card, filters: CardFilters): boolean {
  return filters.every(filter => matchesFilter(card, filter));
}

function matchesFilter(card: Card, filter: CardFilter): boolean {
  switch (filter.field) {
    case CardFilterField.Type:
      return compareEquality(card.type, filter.operator, filter.value);
    case CardFilterField.FrameType:
      return compareEquality(card.frameType, filter.operator, filter.value);
    case CardFilterField.Attribute:
      return compareEquality(card.attribute, filter.operator, filter.value);
    case CardFilterField.Race:
      return compareText(card.race, filter.operator, filter.value);
    case CardFilterField.Archetype:
      return compareText(card.archetype, filter.operator, filter.value);
    case CardFilterField.LinkMarkers:
      return card.linkMarkers.includes(filter.value);
    case CardFilterField.Level:
    case CardFilterField.Atk:
    case CardFilterField.Def:
    case CardFilterField.LinkVal:
      return compareNumber(card[filter.field], filter.operator, filter.value);
    default:
      return exhaust(filter);
  }
}

function compareNumber(
  value: number | undefined,
  operator: ComparisonOperator,
  expected: number
): boolean {
  if (value === undefined) {
    return false;
  }
  return NUMERIC_COMPARISONS[operator](value, expected);
}

function compareText(
  value: string | undefined,
  operator: TextOperator,
  expected: string
): boolean {
  if (value === undefined) {
    return false;
  }
  return TEXT_COMPARISONS[operator](value, expected);
}

function compareEquality(
  value: string | undefined,
  operator: EqualityOperator,
  expected: string
): boolean {
  if (value === undefined) {
    return false;
  }
  return EQUALITY_COMPARISONS[operator](value, expected);
}

function toComparable(value: string): string {
  return value.toLowerCase();
}

function exhaust(value: never): never {
  throw new Error(`Unhandled card filter: ${String(value)}`);
}

import {
  type CardFilter,
  CardFilterField,
  type CardFilters,
  type ComparisonOperator,
  type EqualityOperator,
  FilterOperator,
  Language,
  type TextOperator
} from '@ygo-assistant/cards';

const LANGUAGE_PREDICATES: Record<Language, string> = {
  [Language.English]: "language = 'en'",
  [Language.French]: "language = 'fr'"
};

/**
 * The indexed column behind each filterable field. Only a column named here can
 * reach the query, so the field identifier is never interpolated unchecked.
 */
const COLUMNS: Record<CardFilterField, string> = {
  [CardFilterField.Type]: 'type',
  [CardFilterField.FrameType]: 'frameType',
  [CardFilterField.Race]: 'race',
  [CardFilterField.Attribute]: 'attribute',
  [CardFilterField.Level]: 'level',
  [CardFilterField.Atk]: 'atk',
  [CardFilterField.Def]: 'def',
  [CardFilterField.LinkVal]: 'linkVal',
  [CardFilterField.LinkMarkers]: 'linkMarkers',
  [CardFilterField.Archetype]: 'archetype'
};

const NUMERIC_COMPARATORS: Record<ComparisonOperator, string> = {
  [FilterOperator.Eq]: '=',
  [FilterOperator.Ne]: '<>',
  [FilterOperator.Gt]: '>',
  [FilterOperator.Gte]: '>=',
  [FilterOperator.Lt]: '<',
  [FilterOperator.Lte]: '<='
};

const EQUALITY_COMPARATORS: Record<EqualityOperator, string> = {
  [FilterOperator.Eq]: '=',
  [FilterOperator.Ne]: '<>'
};

type TextPredicate = (column: string, literal: string) => string;

const TEXT_PREDICATES: Record<TextOperator, TextPredicate> = {
  [FilterOperator.Eq]: (column, literal) => `${column} = ${literal}`,
  [FilterOperator.Ne]: (column, literal) => `${column} <> ${literal}`,
  [FilterOperator.Contains]: (column, literal) =>
    `strpos(${column}, ${literal}) > 0`,
  [FilterOperator.StartsWith]: (column, literal) =>
    `starts_with(${column}, ${literal})`,
  [FilterOperator.EndsWith]: (column, literal) =>
    `ends_with(${column}, ${literal})`
};

/**
 * Builds the predicate a LanceDB query filters on: the active language, then
 * every filter AND-combined. It stands in for `cardMatchesFilters`, so text
 * compares case-insensitively and a field the card does not carry is excluded by
 * the null semantics of the comparison, negations included.
 */
export function buildWhereClause(
  language: Language,
  filters: CardFilters
): string {
  const predicates = [LANGUAGE_PREDICATES[language]];
  for (const filter of filters) {
    predicates.push(filterPredicate(filter));
  }
  return predicates.join(' AND ');
}

function filterPredicate(filter: CardFilter): string {
  const column = COLUMNS[filter.field];

  if (filter.field === CardFilterField.LinkMarkers) {
    return `array_contains(${column}, ${stringLiteral(filter.value)})`;
  }
  if (
    filter.field === CardFilterField.Race ||
    filter.field === CardFilterField.Archetype
  ) {
    return textPredicate(column, filter.operator, filter.value);
  }
  if (
    filter.field === CardFilterField.Type ||
    filter.field === CardFilterField.FrameType ||
    filter.field === CardFilterField.Attribute
  ) {
    return `${column} ${EQUALITY_COMPARATORS[filter.operator]} ${stringLiteral(filter.value)}`;
  }
  return `${column} ${NUMERIC_COMPARATORS[filter.operator]} ${numericLiteral(filter.value)}`;
}

function textPredicate(
  column: string,
  operator: TextOperator,
  value: string
): string {
  return TEXT_PREDICATES[operator](
    `lower(${column})`,
    `lower(${stringLiteral(value)})`
  );
}

/**
 * Builds the predicate a by-id card read filters on. The ids are the only
 * caller-supplied input and they are rendered as numbers, so nothing needs
 * quoting.
 */
export function buildIdClause(ids: number[]): string {
  return `id IN (${ids.map(numericLiteral).join(', ')})`;
}

/**
 * Renders a numeric literal. The value is unquoted, so it is only safe once it
 * is known to be a finite integer rather than a caller-supplied string.
 */
function numericLiteral(value: number): string {
  if (!Number.isInteger(value)) {
    throw new Error(
      `A numeric card filter needs an integer value, received ${String(value)}`
    );
  }
  return String(value);
}

/**
 * Renders a SQL string literal. A filter value is the only caller-supplied text
 * in a predicate and LanceDB takes a raw predicate with no parameter binding, so
 * every quote is doubled to keep the value inside its literal. The text
 * operators use plain substring functions rather than `LIKE`, so `%` and `_`
 * carry no special meaning.
 */
function stringLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

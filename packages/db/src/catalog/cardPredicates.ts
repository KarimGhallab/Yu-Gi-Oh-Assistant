import {
  type CardFilter,
  CardFilterField,
  type CardFilters,
  FILTER_FIELD_KINDS,
  FilterKind,
  FilterOperator,
  Language
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
  [CardFilterField.Race]: 'race',
  [CardFilterField.Attribute]: 'attribute',
  [CardFilterField.Level]: 'level',
  [CardFilterField.Atk]: 'atk',
  [CardFilterField.Def]: 'def',
  [CardFilterField.LinkVal]: 'linkVal',
  [CardFilterField.LinkMarkers]: 'linkMarkers',
  [CardFilterField.Archetype]: 'archetype'
};

type TextPredicate = (column: string, literal: string) => string;

const NUMERIC_COMPARATORS: Partial<Record<FilterOperator, string>> = {
  [FilterOperator.Eq]: '=',
  [FilterOperator.Ne]: '<>',
  [FilterOperator.Gt]: '>',
  [FilterOperator.Gte]: '>=',
  [FilterOperator.Lt]: '<',
  [FilterOperator.Lte]: '<='
};

const EQUALITY_COMPARATORS: Partial<Record<FilterOperator, string>> = {
  [FilterOperator.Eq]: '=',
  [FilterOperator.Ne]: '<>'
};

const TEXT_PREDICATES: Partial<Record<FilterOperator, TextPredicate>> = {
  [FilterOperator.Eq]: (column, literal) => `${column} = ${literal}`,
  [FilterOperator.Ne]: (column, literal) => `${column} <> ${literal}`,
  [FilterOperator.Contains]: (column, literal) =>
    `strpos(${column}, ${literal}) > 0`,
  [FilterOperator.StartsWith]: (column, literal) =>
    `starts_with(${column}, ${literal})`,
  [FilterOperator.EndsWith]: (column, literal) =>
    `ends_with(${column}, ${literal})`
};

type FilterRenderer = (column: string, filter: CardFilter) => string;

/**
 * How each field kind renders, total over the kinds so adding one does not
 * compile until it has a renderer. The kind comes from the card filter schema's
 * exhaustive field-kind map, so the classification is declared once there and
 * the SQL follows it.
 */
const FILTER_RENDERERS: Record<FilterKind, FilterRenderer> = {
  [FilterKind.Numeric]: (column, filter) =>
    `${column} ${comparator(NUMERIC_COMPARATORS, filter.operator)} ${numericLiteral(filter.value)}`,
  [FilterKind.Enumerated]: (column, filter) =>
    `${column} ${comparator(EQUALITY_COMPARATORS, filter.operator)} ${stringLiteral(filter.value)}`,
  [FilterKind.Text]: (column, filter) =>
    textPredicate(column, filter.operator, filter.value),
  [FilterKind.Markers]: (column, filter) =>
    `array_contains(${column}, ${stringLiteral(filter.value)})`
};

/**
 * Builds the predicate a LanceDB query filters on: the active language, then
 * every filter AND-combined. It stands in for `cardMatchesFilters`, so free text
 * compares case-insensitively and a field the card does not carry is excluded by
 * the null semantics of the comparison, negations included. An enumerated field
 * compares exactly, because its values are the catalog's own spelling.
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
  const render = FILTER_RENDERERS[FILTER_FIELD_KINDS[filter.field]];
  return render(column, filter);
}

function textPredicate(
  column: string,
  operator: FilterOperator,
  value: unknown
): string {
  const predicate = TEXT_PREDICATES[operator];
  if (predicate === undefined) {
    throw new Error(`The operator "${operator}" has no text predicate`);
  }
  return predicate(`lower(${column})`, `lower(${stringLiteral(value)})`);
}

/**
 * Reads a comparator from the map a field kind owns. A kind only carries the
 * operators its fields accept, so an operator outside them is a disagreement
 * between the schema and the renderer rather than a query to build.
 */
function comparator(
  comparators: Partial<Record<FilterOperator, string>>,
  operator: FilterOperator
): string {
  const rendered = comparators[operator];
  if (rendered === undefined) {
    throw new Error(`The operator "${operator}" has no SQL comparator`);
  }
  return rendered;
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
function numericLiteral(value: unknown): string {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
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
function stringLiteral(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error(
      `A card filter needs a string value, received ${String(value)}`
    );
  }
  return `'${value.replaceAll("'", "''")}'`;
}

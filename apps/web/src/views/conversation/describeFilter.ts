import {
  type CardFilter,
  CardFilterField,
  FilterOperator
} from '@ygo-assistant/contracts';

import { fieldVocabulary } from './filterFields.js';

/**
 * What a filter says in words. The field and the operator are the vocabulary's
 * own machine names, so they are read here rather than sent by the server, and
 * both maps are exhaustive: a field or an operator the domain grows is a
 * compile error until it can be said out loud.
 */
const FIELD_NAMES: Record<CardFilterField, string> = {
  [CardFilterField.Type]: 'Type',
  [CardFilterField.Race]: 'Race',
  [CardFilterField.Attribute]: 'Attribute',
  [CardFilterField.Level]: 'Level',
  [CardFilterField.Atk]: 'Atk',
  [CardFilterField.Def]: 'Def',
  [CardFilterField.LinkVal]: 'Link value',
  [CardFilterField.LinkMarkers]: 'Link markers',
  [CardFilterField.Archetype]: 'Archetype'
};

const OPERATOR_NAMES: Record<FilterOperator, string> = {
  [FilterOperator.Eq]: 'is',
  [FilterOperator.Ne]: 'is not',
  [FilterOperator.Gt]: 'above',
  [FilterOperator.Gte]: 'at least',
  [FilterOperator.Lt]: 'below',
  [FilterOperator.Lte]: 'at most',
  [FilterOperator.Contains]: 'contains',
  [FilterOperator.StartsWith]: 'starts with',
  [FilterOperator.EndsWith]: 'ends with'
};

/**
 * One filter in words: the field it constrains, and what it asks of that field.
 * The two are apart so the readout can set the field quietly and the ask beside
 * it without either becoming a second sentence.
 */
export interface FilterInWords {
  field: string;
  says: string;
}

export const filterFieldName = (field: CardFilterField): string =>
  FIELD_NAMES[field];

export const describeOperator = (operator: FilterOperator): string =>
  OPERATOR_NAMES[operator];

/**
 * What a filter's value is called. A value the domain enumerates is one of its
 * own words, so it is shown lowercase with the data's underscores opened out
 * into spaces: "normal_pendulum" is the catalog's spelling, "normal pendulum"
 * is the one a player reads. A value the player typed, such as an archetype
 * name or a number, is their own word and is left exactly as it is.
 */
export const filterValueName = (
  field: CardFilterField,
  value: string
): string => {
  if (fieldVocabulary(field).values === undefined) {
    return value;
  }

  return value.toLowerCase().replaceAll('_', ' ');
};

export const describeFilter = (filter: CardFilter): FilterInWords => ({
  field: filterFieldName(filter.field),
  says: `${describeOperator(filter.operator)} ${filterValueName(
    filter.field,
    String(filter.value)
  )}`
});

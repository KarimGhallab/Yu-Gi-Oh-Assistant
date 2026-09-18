import {
  type CardFilter,
  type CardFilterField,
  type FilterOperator,
  cardFilterFieldName,
  cardFilterOperatorName
} from '@ygo-assistant/contracts';

import { fieldVocabulary } from './filterFields.js';

/**
 * One filter in words: the field it constrains, and what it asks of that field.
 * The two are apart so the readout can set the field quietly and the ask beside
 * it without either becoming a second sentence.
 */
export interface FilterInWords {
  field: string;
  says: string;
}

/** What a field is called, in the domain's own words. */
export const filterFieldName = (field: CardFilterField): string =>
  cardFilterFieldName(field);

export const describeOperator = (operator: FilterOperator): string =>
  cardFilterOperatorName(operator);

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

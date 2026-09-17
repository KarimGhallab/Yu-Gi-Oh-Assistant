import {
  type CardFilterField,
  type FilterFieldVocabulary,
  describeFilterFields
} from '@ygo-assistant/contracts';

/**
 * The fields a filter may constrain, with the operators and the values each of
 * them accepts, read from the domain's own description of the filter schema.
 * That is what keeps a corrected filter one the search would accept: the
 * controls can only offer what the schema allows, and adding a field to the
 * domain needs no edit here.
 */
const BY_FIELD: Map<CardFilterField, FilterFieldVocabulary> = new Map(
  describeFilterFields().map(entry => [entry.field, entry])
);

export const fieldVocabulary = (
  field: CardFilterField
): FilterFieldVocabulary => {
  const entry = BY_FIELD.get(field);

  if (entry === undefined) {
    throw new Error(
      `The filter vocabulary describes no field called ${field}, so the operators and the values it takes are unknown`
    );
  }

  return entry;
};

/**
 * Whether a field takes a number. The vocabulary says so in the schema's own
 * words, where a whole number is an integer and everything else is text or a set
 * of values.
 */
export const takesNumber = (field: CardFilterField): boolean => {
  const entry = fieldVocabulary(field);

  return entry.values === undefined && entry.valueType === 'integer';
};

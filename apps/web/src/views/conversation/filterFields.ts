import {
  type CardFilterField,
  type FilterFieldVocabulary,
  type FilterOperator,
  describeFilterFields
} from '@ygo-assistant/contracts';

/**
 * The fields a filter may constrain, with the operators and the values each of
 * them accepts, read from the domain's own description of the filter schema.
 * That is what keeps an added filter one the search would accept: the controls
 * can only offer what the schema allows, and adding a field to the domain needs
 * no edit here.
 */
const DESCRIBED: FilterFieldVocabulary[] = describeFilterFields();

const BY_FIELD: Map<CardFilterField, FilterFieldVocabulary> = new Map(
  DESCRIBED.map(entry => [entry.field, entry])
);

/** Every field a filter can constrain, in the domain's own order. */
export const filterFields = (): readonly FilterFieldVocabulary[] => DESCRIBED;

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

/** What a field starts on: the first operator the domain lists for it. */
export const defaultOperator = (field: CardFilterField): FilterOperator =>
  fieldVocabulary(field).operators[0];

/**
 * What a field starts on for its value: the first it accepts, which is a real
 * filter straight away, and nothing at all for a field the player has to fill
 * in, which is what keeps Add out of action until they do.
 */
export const defaultValue = (field: CardFilterField): string =>
  fieldVocabulary(field).values?.[0] ?? '';

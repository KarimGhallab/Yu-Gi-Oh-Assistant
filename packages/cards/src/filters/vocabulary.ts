import { z } from 'zod';

import {
  CardFilterField,
  FilterOperator,
  cardFiltersSchema
} from './schema.js';

/**
 * What one filterable field allows: the operators that fit it, the kind of value
 * it takes, and, when the field is enumerated, the values it accepts. Derived
 * from the card filter schema rather than written by hand, so a field, an
 * operator, or an enumerated value reaches the parse prompt and the client's
 * controls with the schema change alone.
 */
export interface FilterFieldVocabulary {
  field: CardFilterField;
  operators: FilterOperator[];
  valueType: string;
  values?: string[];
  /** The lowest and highest a numeric field may be searched at. */
  minimum?: number;
  maximum?: number;
}

/**
 * The values a JSON schema allows for one key, as zod writes them: a list when
 * the domain allows several, the single one when it allows exactly one. An
 * operator that fits only one kind of field arrives this way.
 */
const allowedValuesSchema = z.union([
  z.object({ enum: z.array(z.string()) }),
  z.object({ const: z.string() })
]);

type AllowedValues = z.infer<typeof allowedValuesSchema>;

const asList = (allowed: AllowedValues): string[] =>
  'enum' in allowed ? allowed.enum : [allowed.const];

/**
 * The part of a JSON schema one filter variant carries. Only the keys the
 * vocabulary reads are declared, so the rest of zod's output, including the
 * keywords it adds for its own purposes, is ignored rather than depended on.
 */
const fieldVariantSchema = z.object({
  properties: z.object({
    field: z.object({ const: z.string() }),
    operator: allowedValuesSchema,
    value: z.object({
      type: z.string(),
      enum: z.array(z.string()).optional(),
      minimum: z.number().optional(),
      maximum: z.number().optional()
    })
  })
});

const filtersSchemaShape = z.object({
  items: z.object({
    oneOf: z.array(fieldVariantSchema).optional(),
    anyOf: z.array(fieldVariantSchema).optional()
  })
});

const FILTER_FIELDS = new Set<string>(Object.values(CardFilterField));

const FILTER_OPERATORS = new Set<string>(Object.values(FilterOperator));

const isFilterField = (value: string): value is CardFilterField =>
  FILTER_FIELDS.has(value);

const isFilterOperator = (value: string): value is FilterOperator =>
  FILTER_OPERATORS.has(value);

/**
 * Describes every field the card filter schema allows, so the parse prompt and
 * the client's controls are both read from the domain rather than restated, and
 * adding a field to the schema is the only edit a new field needs.
 *
 * A field the schema carries that the field enum does not name, or an operator
 * it allows that the operator enum does not name, is a disagreement between the
 * schema and the vocabulary's own types. Nothing could be built from it, so it
 * is raised rather than quietly left out of what the model and the controls are
 * told they may use.
 */
export function describeFilterFields(): FilterFieldVocabulary[] {
  const parsed = filtersSchemaShape.safeParse(
    z.toJSONSchema(cardFiltersSchema)
  );
  if (!parsed.success) {
    throw new Error(
      'The card filter schema no longer has the shape the filter vocabulary reads, so the prompt and the controls cannot describe what the search accepts.'
    );
  }

  const { items } = parsed.data;
  const variants = items.oneOf ?? items.anyOf ?? [];

  return variants.map(variant => {
    const { field, operator, value } = variant.properties;

    if (!isFilterField(field.const)) {
      throw new Error(
        `The card filter schema carries a field the vocabulary cannot name: ${field.const}`
      );
    }

    return {
      field: field.const,
      operators: asOperators(asList(operator)),
      valueType: value.type,
      values: value.enum,
      minimum: value.minimum,
      maximum: value.maximum
    };
  });
}

function asOperators(values: string[]): FilterOperator[] {
  const operators = values.filter(isFilterOperator);

  if (operators.length === values.length) {
    return operators;
  }

  const unknown = values.filter(value => !isFilterOperator(value));

  throw new Error(
    `The card filter schema allows operators the vocabulary cannot name: ${unknown.join(', ')}`
  );
}

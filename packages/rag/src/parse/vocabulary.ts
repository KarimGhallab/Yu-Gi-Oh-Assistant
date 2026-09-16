import { z } from 'zod';

import { cardFiltersSchema } from '@ygo-assistant/cards';

/**
 * What the model is told about one filterable field: the operators that fit it,
 * the kind of value it takes, and, when the field is enumerated, the values it
 * accepts. Derived from the card filter schema rather than written by hand, so
 * a new field, operator, or enumerated value reaches the prompt with the schema
 * change alone.
 */
export interface FilterFieldVocabulary {
  field: string;
  operators: string[];
  valueType: string;
  values?: string[];
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
      enum: z.array(z.string()).optional()
    })
  })
});

const filtersSchemaShape = z.object({
  items: z.object({
    oneOf: z.array(fieldVariantSchema).optional(),
    anyOf: z.array(fieldVariantSchema).optional()
  })
});

/**
 * Describes every field the card filter schema allows, so the prompt and the
 * constraint handed to the model are both read from the domain rather than
 * restated, and adding a field to the schema is the only edit a new field
 * needs.
 */
export function describeFilterFields(): FilterFieldVocabulary[] {
  const parsed = filtersSchemaShape.safeParse(
    z.toJSONSchema(cardFiltersSchema)
  );
  if (!parsed.success) {
    throw new Error(
      'The card filter schema no longer has the shape the parse vocabulary reads, so the prompt cannot describe what the model may answer.'
    );
  }

  const { items } = parsed.data;
  const variants = items.oneOf ?? items.anyOf ?? [];

  return variants.map(variant => {
    const { field, operator, value } = variant.properties;

    return {
      field: field.const,
      operators: asList(operator),
      valueType: value.type,
      values: value.enum
    };
  });
}

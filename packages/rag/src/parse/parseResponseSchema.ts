import { z } from 'zod';

import { cardFiltersSchema } from '@ygo-assistant/cards';

/**
 * The shape a parsing model is asked to produce: the filters it found and the
 * free-text intent, both optional, so an empty answer is a valid pure semantic
 * search. Every parse is checked against this before any of it reaches
 * retrieval, which is what keeps a field, operator, or value the index cannot
 * honor out of a search.
 *
 * The object is strict rather than forgiving: a model that answers under a key
 * of its own invention has not answered the question, and reading that as an
 * empty result would search the whole catalog while looking like a success.
 */
export const parseResponseSchema = z.strictObject({
  filters: cardFiltersSchema.optional(),
  query: z.string().optional()
});

export type ParseResponse = z.infer<typeof parseResponseSchema>;

/**
 * The same shape as a JSON schema, for a model that can be constrained by one.
 * Derived from the schema that validates the answer, so the constraint and the
 * check cannot drift apart.
 */
export function parseFormatSchema(): Record<string, unknown> {
  return z.toJSONSchema(parseResponseSchema);
}

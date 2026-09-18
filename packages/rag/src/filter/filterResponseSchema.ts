import { z } from 'zod';

/**
 * The shape a filtering model is asked to produce: the ids of the candidates
 * that really answer the request. An empty list is a real answer, the way an
 * empty search is, so it is not treated as a failure.
 *
 * The object is strict rather than forgiving: a model that answers under a key
 * of its own invention has not answered the question, and reading that as
 * keeping nothing would say the search found nothing relevant while looking
 * like a judgement.
 */
export const filterResponseSchema = z.strictObject({
  keep: z.array(z.number().int())
});

/**
 * The same shape as a JSON schema, for a model that can be constrained by one.
 * Derived from the schema that validates the answer, so the constraint and the
 * check cannot drift apart.
 */
export function filterFormatSchema(): Record<string, unknown> {
  return z.toJSONSchema(filterResponseSchema);
}

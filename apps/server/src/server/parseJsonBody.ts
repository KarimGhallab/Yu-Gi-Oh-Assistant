import type { Context } from 'hono';
import { z } from 'zod';

import { ValidationError } from '@ygo-assistant/utils';

/**
 * Reads a JSON request body and validates it against a contract schema. A body
 * that is not JSON, or that does not satisfy the schema, becomes a validation
 * error so the transport answers with a client error instead of a server one.
 */
export async function parseJsonBody<TSchema extends z.ZodType>(
  context: Context,
  schema: TSchema
): Promise<z.output<TSchema>> {
  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    throw new ValidationError('The request body must be valid JSON');
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(z.prettifyError(result.error));
  }

  return result.data;
}

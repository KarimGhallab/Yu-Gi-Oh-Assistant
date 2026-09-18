import type { Context } from 'hono';
import { z } from 'zod';

import { ValidationError } from '@ygo-assistant/utils';

/**
 * Reads a JSON request body and validates it against a contract schema. A body
 * that is not JSON, or that does not satisfy the schema, becomes a validation
 * error so the transport answers with a client error instead of a server one.
 *
 * The content type must be JSON. That is a second layer behind the origin
 * guard: a cross-site request that arrives is a "simple" one, whose body is a
 * form or plain text, so refusing anything but JSON closes the door the browser
 * would otherwise leave open.
 */
export async function parseJsonBody<TSchema extends z.ZodType>(
  context: Context,
  schema: TSchema
): Promise<z.output<TSchema>> {
  if (!isJsonContentType(context.req.header('content-type'))) {
    throw new ValidationError('The request body must be JSON');
  }

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

function isJsonContentType(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }

  const separator = value.indexOf(';');
  const mediaType = (separator === -1 ? value : value.slice(0, separator))
    .trim()
    .toLowerCase();

  return mediaType === 'application/json';
}

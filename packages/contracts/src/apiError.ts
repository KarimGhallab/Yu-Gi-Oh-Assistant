import { z } from 'zod';

/**
 * The body of a request that failed. A domain failure carries the message the
 * transport is allowed to show the client; anything else is deliberately
 * opaque.
 */
export const apiErrorSchema = z.object({
  error: z.string()
});

export type ApiError = z.infer<typeof apiErrorSchema>;

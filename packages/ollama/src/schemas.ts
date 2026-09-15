import { z } from 'zod';

/**
 * The response of `GET /api/tags`, narrowed to the fields the client uses.
 */
export const tagsResponseSchema = z.object({
  models: z.array(
    z.object({
      name: z.string().min(1)
    })
  )
});

/**
 * The response of `POST /api/show`, narrowed to the capability list. Models
 * built before Ollama reported capabilities omit the field entirely.
 */
export const showResponseSchema = z.object({
  capabilities: z.array(z.string()).optional()
});

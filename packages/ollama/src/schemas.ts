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

/**
 * The response of `POST /api/embed`, narrowed to the embedding vectors. Vector
 * counts and dimensions are checked against the request by the client, since a
 * schema cannot express them.
 */
export const embedResponseSchema = z.object({
  embeddings: z.array(z.array(z.number()))
});

/**
 * One line of the `POST /api/chat` stream, narrowed to the fields the client
 * uses. The final line carries an empty content and `done: true`.
 */
export const chatChunkSchema = z.object({
  message: z.object({ content: z.string() }),
  done: z.boolean()
});

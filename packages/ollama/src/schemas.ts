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
 * The response of `POST /api/chat`, narrowed to the fields the client
 * uses. The final line carries an empty content and `done: true`.
 */
export const chatChunkSchema = z.object({
  message: z.object({ content: z.string() }),
  done: z.boolean()
});

/**
 * The failure the `ollama` library throws when the server answers with a
 * non-2xx status. The library does not export its `ResponseError` class, so the
 * client recognises that failure by shape: the name the class sets, the status,
 * and the message it carries from the server.
 */
export const responseErrorSchema = z.object({
  name: z.literal('ResponseError'),
  status_code: z.number(),
  message: z.string()
});

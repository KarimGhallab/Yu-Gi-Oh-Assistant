import { z } from 'zod';

/**
 * A model the configured Ollama instance has installed, as the API represents
 * it. A model that cannot complete cannot answer a turn at all, which is what a
 * chooser has to know before it offers one: an installation also holds models
 * that only embed.
 *
 * Whether a model can be held to a shape is the application's answer rather than
 * Ollama's, because Ollama reports no capability for it; a model that answers
 * without being constrained is parsed by prompt and a single repair instead.
 */
export const modelSchema = z.object({
  name: z.string().min(1),
  supportsCompletion: z.boolean(),
  supportsStructuredOutput: z.boolean()
});

export type Model = z.infer<typeof modelSchema>;

/**
 * The models the configured instance has, and the one a conversation starts on
 * when the player has not chosen: the first that can answer a turn. The default
 * is absent when nothing installed can answer, which is a machine that cannot
 * hold a conversation yet.
 */
export const modelListingSchema = z.object({
  models: z.array(modelSchema),
  default: z.string().min(1).optional()
});

export type ModelListing = z.infer<typeof modelListingSchema>;

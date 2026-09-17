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

/**
 * The models a client can choose from, as the server reports them.
 */
export const modelListSchema = z.array(modelSchema);

export type Model = z.infer<typeof modelSchema>;

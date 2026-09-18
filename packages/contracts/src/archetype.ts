import { z } from 'zod';

/**
 * The archetypes the catalog carries, which the client offers as the values the
 * archetype filter accepts. They come from the data rather than from the filter
 * schema, because there are hundreds of them and only the catalog knows which
 * ones exist; the schema keeps the filter free text, so a card whose archetype
 * is no longer in the index can still be read back.
 */
export const archetypeListSchema = z.array(z.string());

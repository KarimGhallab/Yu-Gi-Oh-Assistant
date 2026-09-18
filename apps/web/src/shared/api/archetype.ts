import { archetypeListSchema } from '@ygo-assistant/contracts';

import { apiRequest } from './apiClient.js';

/**
 * The archetypes the catalog carries, so the filter can offer the ones that are
 * really there. The server reads them from the index, so this is as fresh as the
 * moment it was read rather than as fresh as the app was started.
 */
export const listArchetypes = (): Promise<string[]> =>
  apiRequest('/api/archetypes', archetypeListSchema);

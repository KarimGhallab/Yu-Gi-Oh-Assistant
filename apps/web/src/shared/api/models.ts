import { type Model, modelListSchema } from '@ygo-assistant/contracts';

import { apiRequest } from './client.js';

/**
 * The models the configured Ollama instance has installed, with what each of
 * them can do. The server asks the instance every time, so this is as fresh as
 * the moment it was read rather than as fresh as the app was started.
 */
export const listModels = (): Promise<Model[]> =>
  apiRequest('/api/models', modelListSchema);

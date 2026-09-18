import {
  type ModelListing,
  modelListingSchema
} from '@ygo-assistant/contracts';

import { apiRequest } from './apiClient.js';

/**
 * The models the configured Ollama instance has installed, with what each of
 * them can do, and which one answers when the player has not chosen. The server
 * asks the instance every time, so this is as fresh as the moment it was read
 * rather than as fresh as the app was started.
 */
export const listModels = (): Promise<ModelListing> =>
  apiRequest('/api/models', modelListingSchema);

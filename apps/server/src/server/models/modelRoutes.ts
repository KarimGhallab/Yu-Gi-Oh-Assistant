import { Hono } from 'hono';

import { modelListingSchema } from '@ygo-assistant/contracts';

import type { ServerDependencies } from '../types.js';
import { firstAnsweringModel, installedModels } from './modelService.js';

/**
 * The model surface: what the configured Ollama instance has installed, what
 * each of those can do, and which one answers when the player has not chosen, so
 * a client can offer a choice that only names models that are really there and
 * show the model a conversation would start on.
 */
export function createModelRoutes(dependencies: ServerDependencies): Hono {
  const routes = new Hono();

  routes.get('/', async context => {
    const models = await installedModels(dependencies);

    return context.json(
      modelListingSchema.parse({
        models,
        default: firstAnsweringModel(models)?.name
      })
    );
  });

  return routes;
}

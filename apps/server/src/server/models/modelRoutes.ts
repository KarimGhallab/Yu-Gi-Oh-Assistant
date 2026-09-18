import { Hono } from 'hono';

import { modelListSchema } from '@ygo-assistant/contracts';

import type { ServerDependencies } from '../types.js';
import { installedModels } from './modelService.js';

/**
 * The model surface: what the configured Ollama instance has installed and what
 * each of those can do, so a client can offer a choice that only names models
 * that are really there.
 */
export function createModelRoutes(dependencies: ServerDependencies): Hono {
  const routes = new Hono();

  routes.get('/', async context => {
    const models = await installedModels(dependencies);

    return context.json(modelListSchema.parse(models));
  });

  return routes;
}

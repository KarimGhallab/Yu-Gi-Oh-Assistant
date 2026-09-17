import { Hono } from 'hono';

import { modelListSchema } from '@ygo-assistant/contracts';

import type { ServerDependencies } from '../types.js';

/**
 * The model surface: what the configured Ollama instance has installed and what
 * each of those can do, so a client can offer a choice that only names models
 * that are really there.
 *
 * The instance is asked every time rather than remembered here, because what is
 * installed is a property of the machine Ollama runs on and a remembered answer
 * would go stale the moment a model is pulled or removed.
 */
export function createModelRoutes(dependencies: ServerDependencies): Hono {
  const routes = new Hono();

  routes.get('/', async context => {
    const models = await dependencies.ollama.listModels();

    return context.json(modelListSchema.parse(models));
  });

  return routes;
}

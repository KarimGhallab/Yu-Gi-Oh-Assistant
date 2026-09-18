import { Hono } from 'hono';

import { archetypeListSchema } from '@ygo-assistant/contracts';

import type { ServerDependencies } from '../types.js';
import { catalogArchetypes } from './archetypeService.js';

/**
 * The archetype surface: the archetypes the catalog carries, so the filter can
 * offer the ones that really exist instead of asking a player to spell one.
 */
export function createArchetypeRoutes(dependencies: ServerDependencies): Hono {
  const routes = new Hono();

  routes.get('/', async context => {
    const archetypes = await catalogArchetypes(dependencies);

    return context.json(archetypeListSchema.parse(archetypes));
  });

  return routes;
}

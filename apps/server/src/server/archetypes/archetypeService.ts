import type { ServerDependencies } from '../types.js';

/**
 * The archetypes the catalog carries. It is read from the index every time
 * rather than remembered here, because a rebuilt index is a different catalog and
 * a remembered list would offer archetypes that are no longer in it.
 */
export async function catalogArchetypes(
  dependencies: ServerDependencies
): Promise<string[]> {
  const archetypes = await dependencies.catalog.archetypes();

  dependencies.logger.debug('Catalog archetypes listed', {
    count: archetypes.length
  });

  return archetypes;
}

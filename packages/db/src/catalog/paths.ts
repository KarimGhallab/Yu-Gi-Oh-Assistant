import { join } from 'node:path';

const INDEX_DIRECTORY = 'index';
const METADATA_FILE = 'metadata.json';

/**
 * The directory holding the card index for a data directory.
 */
export function indexDirectory(dataDir: string): string {
  return join(dataDir, INDEX_DIRECTORY);
}

/**
 * The file holding the metadata for an index directory.
 */
export function metadataPath(indexDir: string): string {
  return join(indexDir, METADATA_FILE);
}

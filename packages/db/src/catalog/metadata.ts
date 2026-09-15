import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { z } from 'zod';

import { metadataPath } from './paths.js';
import type { IndexMetadata } from './types.js';

const metadataSchema = z.object({
  datasetVersion: z.string().min(1),
  embeddingModel: z.string().min(1),
  dimensions: z.number().int().positive()
});

/**
 * Writes the metadata next to the index, validating it first so a corrupt
 * record never reaches disk.
 */
export async function writeIndexMetadata(
  indexDir: string,
  metadata: IndexMetadata
): Promise<void> {
  const validated = metadataSchema.parse(metadata);
  await mkdir(indexDir, { recursive: true });
  await writeFile(
    metadataPath(indexDir),
    `${JSON.stringify(validated, null, 2)}\n`,
    'utf8'
  );
}

/**
 * Reads the metadata written with an index.
 */
export async function readIndexMetadata(
  indexDir: string
): Promise<IndexMetadata> {
  const content = await readFile(metadataPath(indexDir), 'utf8');
  const parsed: unknown = JSON.parse(content);
  return metadataSchema.parse(parsed);
}

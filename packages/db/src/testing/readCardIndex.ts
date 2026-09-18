import { connect } from '@lancedb/lancedb';

import { CARDS_TABLE } from '../catalog/constants.js';
import { readIndexMetadata } from '../catalog/indexMetadata.js';
import { indexDirectory } from '../catalog/indexPaths.js';
import { normalizeCardRow } from '../catalog/normalizeCard.js';
import type { CardIndexContents } from '../catalog/types.js';

/**
 * Opens the index and reads its rows, row count, and metadata. It is a test
 * helper rather than part of the port: the port is the read surface a caller
 * uses, and this is how a test inspects what ingestion actually wrote.
 */
export async function readCardIndex(
  dataDir: string
): Promise<CardIndexContents> {
  const directory = indexDirectory(dataDir);
  const metadata = await readIndexMetadata(directory);
  const db = await connect(directory);
  const table = await db.openTable(CARDS_TABLE);
  const count = await table.countRows();
  const rawRows = await table.query().toArray();

  return {
    rows: rawRows.map(row => normalizeCardRow(row)),
    count,
    metadata
  };
}

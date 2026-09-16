import { join } from 'node:path';

const DATABASE_FILE = 'app.db';

/**
 * The SQLite database holding the application's state for a data directory. It
 * sits beside the card index, which lives in its own subdirectory.
 */
export function databasePath(dataDir: string): string {
  return join(dataDir, DATABASE_FILE);
}

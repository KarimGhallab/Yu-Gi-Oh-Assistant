import { join } from 'node:path';

import type { Language } from '@ygo-assistant/cards';

const RAW_DIRECTORY = 'raw';

/**
 * The file holding one language's raw dump for a data directory.
 */
export function rawDumpPath(dataDir: string, language: Language): string {
  return join(dataDir, RAW_DIRECTORY, `cards.${language}.json`);
}

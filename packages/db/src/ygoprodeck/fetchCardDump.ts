import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { Language } from '@ygo-assistant/cards';

import { rawDumpPath } from './paths.js';

const DEFAULT_BASE_URL = 'https://db.ygoprodeck.com';
const CARD_INFO_PATH = '/api/v7/cardinfo.php';

/**
 * The `language` query value each language uses. English is the API default, so
 * it is requested without the parameter.
 */
const LANGUAGE_QUERY: Record<Language, string | undefined> = {
  [Language.English]: undefined,
  [Language.French]: 'fr'
};

export interface FetchCardDumpOptions {
  dataDir: string;
  language: Language;
  baseUrl?: string;
}

/**
 * Downloads one language's card dump, saves the raw JSON under the data
 * directory, and returns the payload for conversion.
 */
export async function fetchCardDump(
  options: FetchCardDumpOptions
): Promise<unknown> {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const languageQuery = LANGUAGE_QUERY[options.language];
  const query = languageQuery === undefined ? '' : `?language=${languageQuery}`;
  const url = `${baseUrl}${CARD_INFO_PATH}${query}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch the card dump from ${url}: HTTP ${response.status}`
    );
  }

  const raw = await response.text();
  const path = rawDumpPath(options.dataDir, options.language);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, raw, 'utf8');

  const payload: unknown = JSON.parse(raw);
  return payload;
}

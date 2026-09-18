import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { Language } from '@ygo-assistant/cards';

import { rawDumpPath } from './dumpPaths.js';

const DEFAULT_BASE_URL = 'https://db.ygoprodeck.com';
const CARD_INFO_PATH = '/api/v7/cardinfo.php';

/**
 * The largest dump the fetch will read. The real dumps are far inside it; the
 * bound is what keeps a hostile or broken response from exhausting the process
 * while it is buffered.
 */
const DEFAULT_MAX_BYTES = 256 * 1024 * 1024;

/**
 * The `language` query value each language uses. English is the API default, so
 * it is requested without the parameter.
 */
const LANGUAGE_QUERY: Record<Language, string | undefined> = {
  [Language.English]: undefined,
  [Language.French]: 'fr'
};

/**
 * The dump was larger than the fetch will read.
 */
export class DumpTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`The card dump is larger than the ${maxBytes} byte limit`);
    this.name = 'DumpTooLargeError';
  }
}

/**
 * The dump did not have the digest the operator pinned, so its identity cannot
 * be trusted.
 */
export class DumpIntegrityError extends Error {
  constructor(expected: string, actual: string) {
    super(
      `The card dump digest ${actual} does not match the expected ${expected}`
    );
    this.name = 'DumpIntegrityError';
  }
}

export interface FetchCardDumpOptions {
  dataDir: string;
  language: Language;
  baseUrl?: string;
  /**
   * The largest body to read, in bytes.
   */
  maxBytes?: number;
  /**
   * The SHA-256 the dump must have, when the operator pinned one. An unpinned
   * fetch trusts the transport and the schema instead.
   */
  expectedSha256?: string;
}

/**
 * Downloads one language's card dump, saves the raw JSON under the data
 * directory, and returns the payload for conversion.
 *
 * The body is read under a size cap, and when the operator pinned a SHA-256 the
 * digest is checked before anything is written or parsed. A mismatch fails
 * closed, so a dump from somewhere other than the pinned one never reaches the
 * catalog.
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

  const raw = await readWithinLimit(response, options.maxBytes);
  const digest = createHash('sha256').update(raw).digest('hex');

  if (
    options.expectedSha256 !== undefined &&
    digest !== options.expectedSha256.toLowerCase()
  ) {
    throw new DumpIntegrityError(options.expectedSha256, digest);
  }

  const path = rawDumpPath(options.dataDir, options.language);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, raw, 'utf8');

  const payload: unknown = JSON.parse(raw);
  return payload;
}

/**
 * Reads the response body, refusing to buffer more than the cap. A declared
 * length over the cap is refused before the body is read at all.
 */
async function readWithinLimit(
  response: Response,
  requestedMaxBytes: number | undefined
): Promise<string> {
  const maxBytes = requestedMaxBytes ?? DEFAULT_MAX_BYTES;
  const declared = response.headers.get('content-length');
  if (declared !== null && Number(declared) > maxBytes) {
    throw new DumpTooLargeError(maxBytes);
  }

  const body = response.body;
  if (body === null) {
    const raw = await response.text();
    if (Buffer.byteLength(raw, 'utf8') > maxBytes) {
      throw new DumpTooLargeError(maxBytes);
    }
    return raw;
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    if (value === undefined) {
      continue;
    }

    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new DumpTooLargeError(maxBytes);
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString('utf8');
}

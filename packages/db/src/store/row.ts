import { Language } from '@ygo-assistant/cards';

const LANGUAGES = new Set<string>(Object.values(Language));

const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && LANGUAGES.has(value);

/**
 * Reads an integer from a stored row. SQLite hands back loose values, and a
 * column that does not hold what the schema promised means the store is
 * corrupt, so a mismatch is raised rather than coerced.
 */
export function toNumber(value: unknown, field: string): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  throw unexpected(field, value);
}

export function toString(value: unknown, field: string): string {
  if (typeof value === 'string') {
    return value;
  }
  throw unexpected(field, value);
}

export function toOptionalString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  throw unexpected(field, value);
}

export function toLanguage(value: unknown): Language {
  if (isLanguage(value)) {
    return value;
  }
  throw unexpected('language', value);
}

function unexpected(field: string, value: unknown): Error {
  return new Error(
    `Unexpected value for "${field}" in the conversation store: ${String(value)}`
  );
}

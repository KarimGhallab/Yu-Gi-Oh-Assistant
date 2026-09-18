import { Language } from '@ygo-assistant/cards';

import { createStoredValueReader, enumGuard } from '../storedValue.js';
import { MessageRole } from './types.js';

const LANGUAGES = new Set<string>(Object.values(Language));
const MESSAGE_ROLES = new Set<string>(Object.values(MessageRole));

const isLanguage = enumGuard<Language>(LANGUAGES);
const isMessageRole = enumGuard<MessageRole>(MESSAGE_ROLES);

/**
 * The application store's rows, read through the reader bound to it. The store
 * is the one place that names its source, and a column that does not hold what
 * the schema promised raises rather than reaching the domain.
 */
const store = createStoredValueReader('the application store');

export const { toString, toOptionalString, readJson, writeJson } = store;

/**
 * Reads the language a conversation is stored in, raising when the column is
 * not a member of the vocabulary.
 */
export function toLanguage(value: unknown): Language {
  return store.toEnum(value, isLanguage, 'language');
}

/**
 * Reads the role a message is stored in, raising when the column is not a
 * member of the vocabulary.
 */
export function toMessageRole(value: unknown): MessageRole {
  return store.toEnum(value, isMessageRole, 'role');
}

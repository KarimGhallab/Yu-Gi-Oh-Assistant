import { Language } from '@ygo-assistant/cards';

/**
 * How a language is named in a prompt. A model is told the language to write in
 * by name, because leaving it to read the language from the text is not
 * something a small model does reliably.
 */
const NAMES: Record<Language, string> = {
  [Language.English]: 'English',
  [Language.French]: 'French'
};

/**
 * The name of the language a prompt should ask for its answer in.
 */
export function languageName(language: Language): string {
  return NAMES[language];
}

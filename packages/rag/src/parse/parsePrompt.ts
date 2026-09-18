import type { FilterFieldVocabulary, Language } from '@ygo-assistant/cards';

import { languageName } from '../languageName.js';
import { phrasingSamples } from './phrasingSamples.js';

/**
 * The instruction a parsing model is given: the answer shape it must produce,
 * the vocabulary it may draw on, and the language and wording the free text has
 * to be in. The vocabulary is rendered from the filter schema, so the prompt
 * never lists a field or operator the schema would reject and never misses one
 * it accepts.
 */
export function buildParsePrompt(
  vocabulary: FilterFieldVocabulary[],
  language: Language
): string {
  return [
    'You turn a Yu-Gi-Oh card request into a JSON object for a card search.',
    '',
    'Answer with JSON only, in this shape:',
    '{"filters": [{"field": "...", "operator": "...", "value": ...}], "query": "..."}',
    '',
    'The filters are hard constraints and the query is the free text a semantic search ranks on.',
    'Either part may be left out: omit the filters when the request states no hard constraint, and omit the query when there is nothing to rank.',
    '',
    'Add a filter only when the request itself asks for it, and leave out every field the request does not mention. A vague request is a query with no filters, never a guess.',
    '',
    'Every filter must hold at once, so alternatives a request allows, such as a Spell or a Trap, belong in the query and never in two filters on the same field: two equality filters on one field match nothing.',
    '',
    `Rewrite the request into the query using the wording a Yu-Gi-Oh card uses, because the cards the search must match are written that way, and write it in ${languageName(language)}. Cards of every kind are written like this:`,
    ...phrasingSamples(language).map(sample => `- ${sample}`),
    '',
    'A rewrite in that register says things like "add 1 Spell from your GY to your hand" where the request said "get a spell back from the graveyard". Keep every card the request asks for, and do not copy the examples themselves.',
    '',
    'The fields you may filter on, with the operators each takes and the value each accepts:',
    ...vocabulary.map(describeField),
    '',
    'Use only the fields, operators, and values above. Prefer the few constraints you are certain of over the ones you are guessing at.'
  ].join('\n');
}

/**
 * The instruction a repair is given: what was wrong with the previous answer,
 * and that only another JSON answer will do. The rejection is the validator's
 * own complaint, so the model is shown the offending path and what it may use
 * instead.
 */
export function buildRepairPrompt(rejection: string): string {
  return [
    'That answer was rejected because it did not match the shape the search needs:',
    rejection,
    '',
    'Answer again with JSON only, using the fields, operators, and values listed above. Do not explain the mistake and do not repeat it.'
  ].join('\n');
}

function describeField(entry: FilterFieldVocabulary): string {
  const operators = entry.operators.join(', ');
  const value =
    entry.values === undefined
      ? describeValueType(entry)
      : `one of ${entry.values.join(', ')}`;

  return `- ${entry.field}: operators ${operators}; value is ${value}`;
}

/**
 * What a field takes when it carries no list of values. A number is described
 * with the bounds the game gives it, because a model that is not told them will
 * offer a level of 15 and have its whole answer refused for it.
 */
function describeValueType(entry: FilterFieldVocabulary): string {
  if (entry.valueType !== 'integer') {
    return 'free text';
  }

  const bounds = describeBounds(entry);
  return bounds === undefined ? 'a whole number' : `a whole number ${bounds}`;
}

function describeBounds(entry: FilterFieldVocabulary): string | undefined {
  if (entry.minimum !== undefined && entry.maximum !== undefined) {
    return `from ${entry.minimum} to ${entry.maximum}`;
  }
  if (entry.minimum !== undefined) {
    return `of at least ${entry.minimum}`;
  }
  if (entry.maximum !== undefined) {
    return `of at most ${entry.maximum}`;
  }
  return undefined;
}

import type { FilterFieldVocabulary } from './vocabulary.js';

/**
 * The instruction a parsing model is given: the answer shape it must produce
 * and the vocabulary it may draw on. The vocabulary is rendered from the filter
 * schema, so the prompt never lists a field or operator the schema would reject
 * and never misses one it accepts.
 */
export function buildParsePrompt(vocabulary: FilterFieldVocabulary[]): string {
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
    'The fields you may filter on, with the operators each takes and the value each accepts:',
    ...vocabulary.map(describeField),
    '',
    'Use only the fields, operators, and values above. Prefer the few constraints you are certain of over the ones you are guessing at, and keep the request wording in the query.'
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
      ? describeValueType(entry.valueType)
      : `one of ${entry.values.join(', ')}`;

  return `- ${entry.field}: operators ${operators}; value is ${value}`;
}

function describeValueType(valueType: string): string {
  return valueType === 'integer' ? 'a whole number' : 'free text';
}

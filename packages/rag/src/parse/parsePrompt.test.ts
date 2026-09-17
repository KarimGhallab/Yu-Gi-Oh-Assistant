import { describe, expect, it } from 'vitest';

import { CardAttribute, describeFilterFields } from '@ygo-assistant/cards';

import { buildParsePrompt } from './parsePrompt.js';

const fieldLines = (prompt: string): Map<string, string> =>
  new Map(
    prompt
      .split('\n')
      .filter(line => line.startsWith('- '))
      .map(line => [line.slice(2, line.indexOf(':')), line])
  );

const renderedOperators = (line: string): string[] => {
  const [, afterLabel = ''] = line.split('operators ');
  const [operators = ''] = afterLabel.split(';');

  return operators.split(', ');
};

describe('buildParsePrompt', () => {
  it('renders every field the card domain defines with the operators it takes', () => {
    const prompt = buildParsePrompt(describeFilterFields());
    const lines = fieldLines(prompt);

    for (const entry of describeFilterFields()) {
      const line = lines.get(entry.field);

      expect(line).toBeDefined();
      expect(renderedOperators(line ?? '')).toEqual(entry.operators);
    }
  });

  it('names the values the enumerated fields accept', () => {
    const prompt = buildParsePrompt(describeFilterFields());

    for (const value of Object.values(CardAttribute)) {
      expect(prompt).toContain(value);
    }
  });

  it('asks for the filters and the query the response schema defines', () => {
    const prompt = buildParsePrompt(describeFilterFields());

    expect(prompt).toContain('filters');
    expect(prompt).toContain('query');
  });
});

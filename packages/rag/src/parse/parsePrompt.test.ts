import { describe, expect, it } from 'vitest';

import {
  CardAttribute,
  Language,
  describeFilterFields
} from '@ygo-assistant/cards';

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
    const prompt = buildParsePrompt(describeFilterFields(), Language.English);
    const lines = fieldLines(prompt);

    for (const entry of describeFilterFields()) {
      const line = lines.get(entry.field);

      expect(line).toBeDefined();
      expect(renderedOperators(line ?? '')).toEqual(entry.operators);
    }
  });

  it('names the values the enumerated fields accept', () => {
    const prompt = buildParsePrompt(describeFilterFields(), Language.English);

    for (const value of Object.values(CardAttribute)) {
      expect(prompt).toContain(value);
    }
  });

  it('asks for the filters and the query the response schema defines', () => {
    const prompt = buildParsePrompt(describeFilterFields(), Language.English);

    expect(prompt).toContain('filters');
    expect(prompt).toContain('query');
  });

  it('shows real card texts of every kind to rewrite in the register of', () => {
    const prompt = buildParsePrompt(describeFilterFields(), Language.English);

    expect(prompt).toContain(
      'Discard 2 cards, then target 1 Spell in your GY; add it to your hand.'
    );
    expect(prompt).toContain('negate the activation');
    expect(prompt).toContain(
      'You can banish that monster, also banish this card.'
    );
    expect(prompt).toContain(
      'You can detach 1 material from this card; negate the attack.'
    );
    expect(prompt).toContain(
      'When this card is Synchro Summoned: You can draw 1 card.'
    );
    expect(prompt).toContain('Ritual Summon this card');
  });

  it('shows the samples of the language the rewrite is written in', () => {
    expect(buildParsePrompt(describeFilterFields(), Language.French)).toContain(
      'Défaussez 2 cartes'
    );
    expect(
      buildParsePrompt(describeFilterFields(), Language.English)
    ).not.toContain('Défaussez 2 cartes');
  });

  it('names the language the rewrite is written in', () => {
    expect(
      buildParsePrompt(describeFilterFields(), Language.English)
    ).toContain('write it in English');
    expect(buildParsePrompt(describeFilterFields(), Language.French)).toContain(
      'write it in French'
    );
  });
});

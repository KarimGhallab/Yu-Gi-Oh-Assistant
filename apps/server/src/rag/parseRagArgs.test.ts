import { describe, expect, it } from 'vitest';

import {
  CardFilterField,
  FilterOperator,
  Language
} from '@ygo-assistant/cards';

import { RagArgsError, parseRagArgs } from './parseRagArgs.js';

describe('parseRagArgs', () => {
  it('reads the prompt from every positional word', () => {
    const args = parseRagArgs(['a', 'dragon', 'with', 'high', 'attack']);

    expect(args.prompt).toBe('a dragon with high attack');
    expect(args.language).toBe(Language.English);
    expect(args.parse).toBe(true);
    expect(args.answer).toBe(true);
    expect(args.filter).toBe(true);
    expect(args.model).toBeUndefined();
    expect(args.filters).toBeUndefined();
    expect(args.topK).toBeUndefined();
    expect(args.shown).toBeUndefined();
    expect(args.minScore).toBeUndefined();
    expect(args.filterPool).toBeUndefined();
    expect(args.debug).toBe(false);
    expect(args.json).toBe(false);
    expect(args.help).toBe(false);
  });

  it('leaves the prompt absent when nothing was given', () => {
    expect(parseRagArgs([]).prompt).toBeUndefined();
  });

  it('reads every flag it offers', () => {
    const args = parseRagArgs([
      'dragons',
      '--language',
      'fr',
      '--model',
      'mistral:7b',
      '--top-k',
      '10',
      '--shown',
      '3',
      '--min-score',
      '0.25',
      '--filter-pool',
      '30',
      '--retrieve-only',
      '--no-parse',
      '--no-filter',
      '--debug',
      '--json'
    ]);

    expect(args.language).toBe(Language.French);
    expect(args.model).toBe('mistral:7b');
    expect(args.topK).toBe(10);
    expect(args.shown).toBe(3);
    expect(args.minScore).toBe(0.25);
    expect(args.filterPool).toBe(30);
    expect(args.answer).toBe(false);
    expect(args.parse).toBe(false);
    expect(args.filter).toBe(false);
    expect(args.debug).toBe(true);
    expect(args.json).toBe(true);
  });

  it('reads an edited filter set from JSON', () => {
    const args = parseRagArgs([
      'dragons',
      '--filters',
      JSON.stringify([{ field: 'race', operator: 'eq', value: 'Dragon' }])
    ]);

    expect(args.filters).toEqual([
      {
        field: CardFilterField.Race,
        operator: FilterOperator.Eq,
        value: 'Dragon'
      }
    ]);
  });

  it('refuses a filter set that is not JSON', () => {
    expect(() => parseRagArgs(['dragons', '--filters', 'not json'])).toThrow(
      RagArgsError
    );
  });

  it('refuses a filter set the schema does not accept', () => {
    expect(() =>
      parseRagArgs(['dragons', '--filters', '[{"field":"power"}]'])
    ).toThrow(RagArgsError);
  });

  it('refuses filters and no-parse together', () => {
    expect(() =>
      parseRagArgs(['dragons', '--no-parse', '--filters', '[]'])
    ).toThrow(RagArgsError);
  });

  it('refuses a language the catalog is not indexed in', () => {
    expect(() => parseRagArgs(['dragons', '--language', 'de'])).toThrow(
      RagArgsError
    );
  });

  it('refuses a count that is not a positive whole number', () => {
    expect(() => parseRagArgs(['dragons', '--top-k', 'many'])).toThrow(
      RagArgsError
    );
    expect(() => parseRagArgs(['dragons', '--shown', '0'])).toThrow(
      RagArgsError
    );
  });

  it('refuses an option it does not know', () => {
    expect(() => parseRagArgs(['dragons', '--languge', 'fr'])).toThrow(
      RagArgsError
    );
  });
});

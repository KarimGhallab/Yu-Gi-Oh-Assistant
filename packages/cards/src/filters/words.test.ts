import { describe, expect, it } from 'vitest';

import { Language } from '../enums.js';
import { CardFilterField, FilterOperator } from './schema.js';
import { cardFilterFieldName, cardFilterOperatorName } from './words.js';

describe('the filter vocabulary in words', () => {
  it('names every field in every language', () => {
    for (const language of Object.values(Language)) {
      for (const field of Object.values(CardFilterField)) {
        expect(cardFilterFieldName(field, language).length).toBeGreaterThan(0);
      }
    }
  });

  it('names a field in English unless another language is asked for', () => {
    expect(cardFilterFieldName(CardFilterField.Attribute)).toBe('Attribute');
    expect(
      cardFilterFieldName(CardFilterField.Attribute, Language.English)
    ).toBe('Attribute');
    expect(
      cardFilterFieldName(CardFilterField.Attribute, Language.French)
    ).toBe('Attribut');
  });

  it('names every operator', () => {
    for (const operator of Object.values(FilterOperator)) {
      expect(cardFilterOperatorName(operator).length).toBeGreaterThan(0);
    }
  });
});

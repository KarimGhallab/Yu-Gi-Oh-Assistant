import { describe, expect, it } from 'vitest';

import { Language } from '@ygo-assistant/cards';

import { phrasingSamples } from './phrasingSamples.js';

describe('phrasingSamples', () => {
  it('carries five spells and traps, three monsters, and three of each extra-deck kind', () => {
    expect(phrasingSamples(Language.English)).toHaveLength(14);
    expect(phrasingSamples(Language.French)).toHaveLength(14);
  });

  it('gives each language its own card texts', () => {
    const english = phrasingSamples(Language.English).flat().join('\n');
    const french = phrasingSamples(Language.French).flat().join('\n');

    expect(english).toContain('GY');
    expect(french).toContain('Cimetière');
    expect(french).not.toContain('GY');
  });
});

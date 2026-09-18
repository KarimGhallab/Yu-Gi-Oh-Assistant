import { describe, expect, it } from 'vitest';

import type { Model } from '@ygo-assistant/contracts';

import { describeModel } from './modelPolicy.js';

/**
 * The three a policy has to tell apart: a model that answers and takes a schema,
 * one that answers without one, and one that only embeds.
 */
const SCHEMA_MODEL: Model = {
  name: 'llama3.1:8b',
  supportsCompletion: true,
  supportsStructuredOutput: true
};

const PROMPT_MODEL: Model = {
  name: 'mistral:7b',
  supportsCompletion: true,
  supportsStructuredOutput: false
};

const EMBEDDING_MODEL: Model = {
  name: 'nomic-embed-text',
  supportsCompletion: false,
  supportsStructuredOutput: false
};

describe('the model policy', () => {
  it('reads the chosen model and says nothing when it can do everything', () => {
    const policy = describeModel(
      [SCHEMA_MODEL, PROMPT_MODEL],
      SCHEMA_MODEL.name
    );

    expect(policy.selected).toEqual(SCHEMA_MODEL);
    expect(policy.missing).toBe(false);
    expect(policy.note).toBeUndefined();
    expect(policy.alerts).toEqual([]);
  });

  it('offers every model with the terse fact about what it can do', () => {
    const policy = describeModel(
      [SCHEMA_MODEL, PROMPT_MODEL, EMBEDDING_MODEL],
      SCHEMA_MODEL.name
    );

    expect(policy.choices).toEqual([
      { value: SCHEMA_MODEL.name, name: SCHEMA_MODEL.name, disabled: false },
      {
        value: PROMPT_MODEL.name,
        name: PROMPT_MODEL.name,
        note: 'no structured filters',
        disabled: false
      },
      {
        value: EMBEDDING_MODEL.name,
        name: EMBEDDING_MODEL.name,
        note: 'cannot answer',
        disabled: true
      }
    ]);
  });

  it('says a model without a schema is parsed from the prompt', () => {
    const policy = describeModel([PROMPT_MODEL], PROMPT_MODEL.name);

    expect(policy.note).toBe(
      'mistral:7b cannot produce structured filters, so a request is parsed from the prompt.'
    );
    expect(policy.alerts).toEqual([]);
  });

  it('warns when the chosen model cannot answer at all', () => {
    const policy = describeModel([EMBEDDING_MODEL], EMBEDDING_MODEL.name);

    expect(policy.note).toBeUndefined();
    expect(policy.alerts).toEqual(['nomic-embed-text cannot answer a turn.']);
  });

  it('names a chosen model the listing lacks, and how to install it', () => {
    const policy = describeModel([PROMPT_MODEL], SCHEMA_MODEL.name);

    expect(policy.selected).toBeUndefined();
    expect(policy.missing).toBe(true);
    expect(policy.choices).toEqual([
      {
        value: PROMPT_MODEL.name,
        name: PROMPT_MODEL.name,
        note: 'no structured filters',
        disabled: false
      },
      { value: SCHEMA_MODEL.name, name: SCHEMA_MODEL.name }
    ]);
    expect(policy.alerts).toEqual([
      'llama3.1:8b is not installed. Run ollama pull llama3.1:8b to install it.'
    ]);
  });

  it('treats a listing that has not arrived as holding nothing to miss', () => {
    const policy = describeModel(undefined, SCHEMA_MODEL.name);

    expect(policy.selected).toBeUndefined();
    expect(policy.missing).toBe(false);
    expect(policy.choices).toEqual([]);
    expect(policy.alerts).toEqual([]);
  });

  it('treats no chosen name as no choice rather than a missing one', () => {
    const policy = describeModel([SCHEMA_MODEL], '');

    expect(policy.missing).toBe(false);
    expect(policy.note).toBeUndefined();
    expect(policy.alerts).toEqual([]);
  });
});

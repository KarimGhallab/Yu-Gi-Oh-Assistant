import { describe, expect, it } from 'vitest';

import {
  CardFilterField,
  CardRace,
  CardType,
  Language
} from '@ygo-assistant/cards';
import {
  type ChatChunk,
  type ChatRequest,
  ChatRole,
  type IOllamaClient
} from '@ygo-assistant/ollama';

import { ParseOutcome, type ParseResult } from '../types.js';
import { parseCardRequest } from './parseCardRequest.js';

const MODEL = 'mistral:7b';
const REQUEST = 'light monsters that banish cards';

interface StubModel {
  client: IOllamaClient;
  requests: ChatRequest[];
}

const createStubModel = (responses: string[]): StubModel => {
  const requests: ChatRequest[] = [];

  const client: IOllamaClient = {
    listModels: async () => [],
    embed: async () => [],
    chat: (request: ChatRequest) => {
      requests.push(request);
      return reply(responses[requests.length - 1] ?? '');
    }
  };

  return { client, requests };
};

async function* reply(content: string): AsyncGenerator<ChatChunk> {
  yield { content, done: true };
}

async function* failingStream(): AsyncGenerator<ChatChunk> {
  yield { content: '{"query":', done: false };
  throw new Error('the model server went away');
}

const json = (value: unknown): string => JSON.stringify(value);

const parseAnswers = async (
  responses: string[],
  supportsStructuredOutput = true
): Promise<{ result: ParseResult; model: StubModel }> => {
  const model = createStubModel(responses);
  const result = await parseCardRequest({
    client: model.client,
    model: MODEL,
    supportsStructuredOutput,
    request: REQUEST,
    language: Language.English
  });

  return { result, model };
};

const parse = async (
  response: string,
  supportsStructuredOutput = true
): Promise<{ result: ParseResult; model: StubModel }> =>
  parseAnswers([response], supportsStructuredOutput);

describe('parseCardRequest', () => {
  it('returns the filters the model found', async () => {
    const { result } = await parse(
      json({
        filters: [{ field: 'attribute', operator: 'eq', value: 'LIGHT' }]
      })
    );

    expect(result).toEqual({
      outcome: ParseOutcome.Parsed,
      filters: [{ field: 'attribute', operator: 'eq', value: 'LIGHT' }],
      query: undefined
    });
  });

  it('returns the filters and the free-text query together', async () => {
    const { result } = await parse(
      json({
        filters: [
          { field: 'type', operator: 'eq', value: CardType.EffectMonster }
        ],
        query: 'applies a banish effect'
      })
    );

    expect(result).toEqual({
      outcome: ParseOutcome.Parsed,
      filters: [
        { field: 'type', operator: 'eq', value: CardType.EffectMonster }
      ],
      query: 'applies a banish effect'
    });
  });

  it('accepts an empty result as a pure semantic search', async () => {
    const { result } = await parse(json({}));

    expect(result).toEqual({
      outcome: ParseOutcome.Parsed,
      filters: [],
      query: undefined
    });
  });

  it('drops equality filters on one field that cannot hold at once', async () => {
    const { result } = await parse(
      json({
        filters: [
          { field: 'type', operator: 'eq', value: CardType.SpellCard },
          { field: 'type', operator: 'eq', value: CardType.TrapCard }
        ],
        query: 'add 1 Spell or Trap from your GY to your hand'
      })
    );

    expect(result).toEqual({
      outcome: ParseOutcome.Parsed,
      filters: [],
      query: 'add 1 Spell or Trap from your GY to your hand'
    });
  });

  it('accepts a free-text-only result', async () => {
    const { result } = await parse(json({ query: 'a defensive board' }));

    expect(result).toEqual({
      outcome: ParseOutcome.Parsed,
      filters: [],
      query: 'a defensive board'
    });
  });

  it('treats a blank query as no query', async () => {
    const { result } = await parse(json({ query: '   ' }));

    expect(result).toEqual({
      outcome: ParseOutcome.Parsed,
      filters: [],
      query: undefined
    });
  });

  it('constrains a model that supports structured output at temperature 0', async () => {
    const { model } = await parse(json({}));
    const [request] = model.requests;

    expect(request?.temperature).toBe(0);
    const format = JSON.stringify(request?.format);
    for (const field of Object.values(CardFilterField)) {
      expect(format).toContain(field);
    }
  });

  it('asks a model that cannot be constrained for JSON without a format', async () => {
    const { result, model } = await parse(json({ query: 'burn' }), false);

    expect(model.requests[0]?.format).toBeUndefined();
    expect(result).toEqual({
      outcome: ParseOutcome.Parsed,
      filters: [],
      query: 'burn'
    });
  });

  it("asks the caller's model, sending the request as the user message", async () => {
    const { model } = await parse(json({}));
    const [request] = model.requests;

    expect(model.requests).toHaveLength(1);
    expect(request?.model).toBe(MODEL);
    expect(request?.messages.at(-1)).toEqual({
      role: ChatRole.User,
      content: REQUEST
    });
  });

  it('tells a parsed request apart from a degraded one', async () => {
    const parsed = await parse(json({ query: 'burn' }));
    const degraded = await parse('I suggest Dark Magician.');

    expect(parsed.result.outcome).toBe(ParseOutcome.Parsed);
    expect(degraded.result.outcome).toBe(ParseOutcome.Degraded);
  });

  it('degrades to the request itself when the model does not answer with JSON', async () => {
    const { result } = await parse('I would suggest Dark Magician.');

    expect(result).toEqual({ outcome: ParseOutcome.Degraded, query: REQUEST });
  });

  it('degrades to the request itself when the model answers with nothing', async () => {
    const { result } = await parse('');

    expect(result).toEqual({ outcome: ParseOutcome.Degraded, query: REQUEST });
  });

  it('degrades to the request exactly as it was given', async () => {
    const request = '  a light monster  ';
    const model = createStubModel(['I would suggest Dark Magician.']);
    const result = await parseCardRequest({
      client: model.client,
      model: MODEL,
      supportsStructuredOutput: true,
      request,
      language: Language.English
    });

    expect(result).toEqual({ outcome: ParseOutcome.Degraded, query: request });
  });

  it('lets a model stream that fails partway through escape rather than degrading', async () => {
    const client: IOllamaClient = {
      listModels: async () => [],
      embed: async () => [],
      chat: async function* chatThatFails() {
        yield { content: '{"query":', done: false };
        throw new Error('the model server is unreachable');
      }
    };

    await expect(
      parseCardRequest({
        client,
        model: MODEL,
        supportsStructuredOutput: true,
        request: REQUEST,
        language: Language.English
      })
    ).rejects.toThrow('the model server is unreachable');
  });

  it('degrades when the model names a field the card domain does not define', async () => {
    const { result } = await parse(
      json({ filters: [{ field: 'banishes', operator: 'eq', value: 'yes' }] })
    );

    expect(result).toEqual({ outcome: ParseOutcome.Degraded, query: REQUEST });
  });

  it('degrades when the model names a value the card domain does not allow', async () => {
    const { result } = await parse(
      json({ filters: [{ field: 'race', operator: 'eq', value: 'Toon' }] })
    );

    expect(result).toEqual({ outcome: ParseOutcome.Degraded, query: REQUEST });
  });

  it('degrades when the model uses an operator the field does not take', async () => {
    const { result } = await parse(
      json({ filters: [{ field: 'race', operator: 'gte', value: 'Dragon' }] })
    );

    expect(result).toEqual({ outcome: ParseOutcome.Degraded, query: REQUEST });
  });

  it('returns a filter on a numeric field with a comparison operator', async () => {
    const { result } = await parse(
      json({ filters: [{ field: 'level', operator: 'lte', value: 4 }] })
    );

    expect(result).toEqual({
      outcome: ParseOutcome.Parsed,
      filters: [{ field: 'level', operator: 'lte', value: 4 }],
      query: undefined
    });
  });

  it('returns an equality filter on an enumerated field', async () => {
    const { result } = await parse(
      json({
        filters: [
          { field: 'race', operator: 'eq', value: CardRace.Spellcaster }
        ]
      })
    );

    expect(result).toEqual({
      outcome: ParseOutcome.Parsed,
      filters: [{ field: 'race', operator: 'eq', value: CardRace.Spellcaster }],
      query: undefined
    });
  });
});

describe('parseCardRequest repair', () => {
  it('accepts a repaired answer from a model that cannot be constrained', async () => {
    const { result, model } = await parseAnswers(
      ['I would suggest Dark Magician.', json({ query: 'banish' })],
      false
    );

    expect(result).toEqual({
      outcome: ParseOutcome.Parsed,
      filters: [],
      query: 'banish'
    });
    expect(model.requests).toHaveLength(2);
    expect(model.requests.every(request => request.format === undefined)).toBe(
      true
    );
  });

  it('asks for no repair when the first answer already validates', async () => {
    const { model } = await parseAnswers([json({ query: 'burn' })], false);

    expect(model.requests).toHaveLength(1);
  });

  it('reaches the result a model that answered correctly the first time would give', async () => {
    const answer = json({
      filters: [{ field: 'level', operator: 'lte', value: 4 }],
      query: 'dragons'
    });

    const repaired = await parseAnswers(['not JSON at all', answer]);
    const direct = await parse(answer);

    expect(repaired.result).toEqual(direct.result);
  });

  it('shows the repair what the model answered and what was wrong with it', async () => {
    const rejected = json({
      filters: [{ field: 'banishes', operator: 'eq', value: 'yes' }]
    });
    const { model } = await parseAnswers([rejected, json({ query: 'banish' })]);
    const repair = model.requests[1]?.messages ?? [];

    expect(repair.at(-2)).toEqual({
      role: ChatRole.Assistant,
      content: rejected
    });
    // The complaint is the validator's own, so this follows its wording.
    expect(repair.at(-1)?.content).toContain('filters[0].field');
  });

  it('names an answer that was not JSON rather than quoting an error it never had', async () => {
    const { model } = await parseAnswers([
      'I would suggest Dark Magician.',
      json({ query: 'banish' })
    ]);

    expect(model.requests[1]?.messages.at(-1)?.content).toContain('not JSON');
  });

  it('tells a JSON answer of the wrong kind apart from an answer that was not JSON', async () => {
    const { model } = await parseAnswers(['null', json({ query: 'banish' })]);
    const complaint = model.requests[1]?.messages.at(-1)?.content ?? '';

    expect(complaint).not.toContain('was not JSON');
    expect(complaint).toContain('received null');
  });

  it('degrades when the repair cannot reach the model at all', async () => {
    let calls = 0;
    const client: IOllamaClient = {
      listModels: async () => [],
      embed: async () => [],
      chat: () => {
        calls += 1;

        return calls === 1 ? reply('not JSON at all') : failingStream();
      }
    };

    const result = await parseCardRequest({
      client,
      model: MODEL,
      supportsStructuredOutput: false,
      request: REQUEST,
      language: Language.English
    });

    expect(result).toEqual({ outcome: ParseOutcome.Degraded, query: REQUEST });
    expect(calls).toBe(2);
  });

  it('repairs a model that supports structured output under the same schema', async () => {
    const { result, model } = await parseAnswers(
      ['not JSON at all', json({ query: 'banish' })],
      true
    );

    expect(result.outcome).toBe(ParseOutcome.Parsed);
    expect(model.requests).toHaveLength(2);
    expect(model.requests.every(request => request.format !== undefined)).toBe(
      true
    );
    expect(model.requests[1]?.temperature).toBe(0);
  });

  it('degrades after the repair fails too, having asked exactly twice', async () => {
    const { result, model } = await parseAnswers([
      'I would suggest Dark Magician.',
      'Still not JSON, sorry.'
    ]);

    expect(result).toEqual({ outcome: ParseOutcome.Degraded, query: REQUEST });
    expect(model.requests).toHaveLength(2);
  });

  it('degrades after a repair that answers with a shape the domain does not allow', async () => {
    const { result } = await parseAnswers([
      'I would suggest Dark Magician.',
      json({ filters: [{ field: 'banishes', operator: 'eq', value: 'yes' }] })
    ]);

    expect(result).toEqual({ outcome: ParseOutcome.Degraded, query: REQUEST });
  });
});

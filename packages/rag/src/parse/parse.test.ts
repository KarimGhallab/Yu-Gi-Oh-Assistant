import { describe, expect, it } from 'vitest';

import { CardFilterField, CardType, FrameType } from '@ygo-assistant/cards';
import {
  type ChatChunk,
  type ChatRequest,
  ChatRole,
  type IOllamaClient
} from '@ygo-assistant/ollama';

import { ParseOutcome, type ParseResult } from '../types.js';
import { parseCardRequest } from './parse.js';

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

const json = (value: unknown): string => JSON.stringify(value);

const parse = async (
  response: string,
  supportsStructuredOutput = true
): Promise<{ result: ParseResult; model: StubModel }> => {
  const model = createStubModel([response]);
  const result = await parseCardRequest({
    client: model.client,
    model: MODEL,
    supportsStructuredOutput,
    request: REQUEST
  });

  return { result, model };
};

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
      request
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
        request: REQUEST
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
      json({
        filters: [{ field: 'frameType', operator: 'eq', value: 'quick-play' }]
      })
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
          { field: 'frameType', operator: 'eq', value: FrameType.Spell }
        ]
      })
    );

    expect(result).toEqual({
      outcome: ParseOutcome.Parsed,
      filters: [{ field: 'frameType', operator: 'eq', value: FrameType.Spell }],
      query: undefined
    });
  });
});

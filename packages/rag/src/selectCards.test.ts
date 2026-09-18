import { describe, expect, it } from 'vitest';

import {
  type Card,
  CardAttribute,
  CardType,
  FrameType,
  Language
} from '@ygo-assistant/cards';
import {
  type ChatChunk,
  type ChatRequest,
  type IOllamaClient
} from '@ygo-assistant/ollama';

import { selectCards } from './selectCards.js';
import type { RankedCard } from './types.js';

const REQUEST = 'a card that gets a spell back from the graveyard';

const createCard = (id: number): Card => ({
  id,
  name: `Card ${id}`,
  language: Language.English,
  type: CardType.NormalMonster,
  frameType: FrameType.Normal,
  typeLine: ['Dragon', 'Normal'],
  race: 'Dragon',
  attribute: CardAttribute.Light,
  linkMarkers: [],
  effect: 'A legendary dragon.',
  imageUrl: `https://images.example.test/cards/${id}.jpg`,
  sourceUrl: `https://example.test/cards/${id}`
});

const ranked = (ids: number[]): RankedCard[] =>
  ids.map((id, index) => ({ card: createCard(id), score: 1 - index / 100 }));

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

const base = {
  model: 'mistral:7b',
  supportsStructuredOutput: true,
  request: REQUEST
};

describe('selectCards', () => {
  it('takes the search own ranking when no judgement is asked for', async () => {
    const model = createStubModel([]);

    const selection = await selectCards({
      ...base,
      client: model.client,
      ranked: ranked([1, 2, 3]),
      pool: 25,
      shown: 2,
      filter: false
    });

    expect(selection.cards.map(card => card.id)).toEqual([1, 2]);
    expect(selection.pool).toBe(0);
    expect(selection.fellBack).toBe(false);
    expect(model.requests).toHaveLength(0);
  });

  it('shows what the model kept, capped at what may be shown', async () => {
    const model = createStubModel([json({ keep: [1, 2, 3] })]);

    const selection = await selectCards({
      ...base,
      client: model.client,
      ranked: ranked([1, 2, 3]),
      pool: 25,
      shown: 2,
      filter: true
    });

    expect(selection.cards.map(card => card.id)).toEqual([1, 2]);
    expect(selection.pool).toBe(3);
    expect(selection.fellBack).toBe(false);
  });

  it('asks the model about the pool and no further', async () => {
    const model = createStubModel([json({ keep: [1] })]);

    await selectCards({
      ...base,
      client: model.client,
      ranked: ranked([1, 2, 3, 4, 5]),
      pool: 2,
      shown: 1,
      filter: true
    });

    const prompt = model.requests[0]?.messages[0]?.content ?? '';
    expect(prompt).toContain('Card 2');
    expect(prompt).not.toContain('Card 3');
  });

  it('falls back to the search own ranking when the judgement fails', async () => {
    const model = createStubModel(['not JSON at all']);

    const selection = await selectCards({
      ...base,
      client: model.client,
      ranked: ranked([1, 2, 3]),
      pool: 25,
      shown: 2,
      filter: true
    });

    expect(selection.cards.map(card => card.id)).toEqual([1, 2]);
    expect(selection.pool).toBe(3);
    expect(selection.fellBack).toBe(true);
  });

  it('shows nothing when the model keeps nothing', async () => {
    const model = createStubModel([json({ keep: [] })]);

    const selection = await selectCards({
      ...base,
      client: model.client,
      ranked: ranked([1, 2, 3]),
      pool: 25,
      shown: 2,
      filter: true
    });

    expect(selection.cards).toEqual([]);
    expect(selection.fellBack).toBe(false);
  });
});

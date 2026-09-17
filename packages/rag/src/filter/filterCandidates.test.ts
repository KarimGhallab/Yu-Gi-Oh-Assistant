import { describe, expect, it } from 'vitest';

import { type Card, CardType, FrameType, Language } from '@ygo-assistant/cards';
import {
  type ChatChunk,
  type ChatRequest,
  type IOllamaClient
} from '@ygo-assistant/ollama';

import { filterCandidates } from './filterCandidates.js';

const REQUEST = 'a card that gets a spell back from the graveyard';

const createCard = (id: number, name: string): Card => ({
  id,
  name,
  language: Language.English,
  type: CardType.SpellCard,
  frameType: FrameType.Spell,
  typeLine: [],
  race: 'Normal',
  linkMarkers: [],
  effect: 'Discard 2 cards; add 1 Spell from your GY to your hand.',
  imageUrl: `https://images.example.test/cards/${id}.jpg`,
  sourceUrl: `https://example.test/cards/${id}`
});

const POOL = [
  createCard(1, 'Magical Stone Excavation'),
  createCard(2, 'Monster Reborn'),
  createCard(3, 'Trap Reclamation')
];

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

const filter = (
  response: string,
  pool: Card[] = POOL,
  supportsStructuredOutput = true
): Promise<Card[]> => {
  const model = createStubModel([response]);

  return filterCandidates({
    client: model.client,
    model: 'mistral:7b',
    supportsStructuredOutput,
    request: REQUEST,
    pool
  });
};

describe('filterCandidates', () => {
  it('keeps what the model kept, in the order the search ranked it', async () => {
    const kept = await filter(json({ keep: [3, 1] }));

    expect(kept.map(card => card.id)).toEqual([1, 3]);
  });

  it('drops an id the pool does not hold', async () => {
    const kept = await filter(json({ keep: [999, 2] }));

    expect(kept.map(card => card.id)).toEqual([2]);
  });

  it('answers with nothing when the model keeps nothing', async () => {
    expect(await filter(json({ keep: [] }))).toEqual([]);
  });

  it('raises when the model does not answer with a list of ids', async () => {
    await expect(
      filter('I would keep Magical Stone Excavation.')
    ).rejects.toThrow(/list of card ids/);
  });

  it('raises when the answer carries a key the schema does not define', async () => {
    await expect(
      filter(json({ keep: [1], because: 'it does' }))
    ).rejects.toThrow(/list of card ids/);
  });

  it('asks with the player own request and every candidate, against no creativity', async () => {
    const model = createStubModel([json({ keep: [1] })]);

    await filterCandidates({
      client: model.client,
      model: 'mistral:7b',
      supportsStructuredOutput: true,
      request: REQUEST,
      pool: POOL
    });

    const request = model.requests[0];
    expect(request?.messages[1]?.content).toBe(REQUEST);
    expect(request?.messages[0]?.content).toContain(
      '1: Magical Stone Excavation'
    );
    expect(request?.messages[0]?.content).toContain('3: Trap Reclamation');
    expect(request?.temperature).toBe(0);
    expect(request?.format).toBeDefined();
  });

  it('leaves the answer unconstrained when the model cannot be constrained', async () => {
    const model = createStubModel([json({ keep: [1] })]);

    await filterCandidates({
      client: model.client,
      model: 'mistral:7b',
      supportsStructuredOutput: false,
      request: REQUEST,
      pool: POOL
    });

    expect(model.requests[0]?.format).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';

import {
  type Card,
  CardAttribute,
  CardType,
  FrameType,
  Language,
  LinkMarker
} from '@ygo-assistant/cards';
import {
  type ChatChunk,
  type ChatRequest,
  ChatRole,
  type IOllamaClient
} from '@ygo-assistant/ollama';

import { streamGroundedAnswer } from './answer.js';

const MODEL = 'llama3.1:8b';
const REQUEST = 'light monsters that banish cards';

const createCard = (overrides: Partial<Card> = {}): Card => ({
  id: 89631139,
  name: 'Blue-Eyes White Dragon',
  language: Language.English,
  type: CardType.NormalMonster,
  frameType: FrameType.Normal,
  typeLine: ['Dragon', 'Normal'],
  race: 'Dragon',
  attribute: CardAttribute.Light,
  level: 8,
  atk: 3000,
  def: 2500,
  linkMarkers: [],
  effect: 'This legendary dragon is a powerful engine of destruction.',
  imageUrl: 'https://images.ygoprodeck.com/images/cards/89631139.jpg',
  sourceUrl: 'https://ygoprodeck.com/card/blue-eyes-white-dragon-4002',
  ...overrides
});

interface StubClient {
  client: IOllamaClient;
  requests: ChatRequest[];
}

const createStubClient = (chunks: ChatChunk[]): StubClient => {
  const requests: ChatRequest[] = [];

  const client: IOllamaClient = {
    listModels: async () => [],
    embed: async () => [],
    chat: (request: ChatRequest) => {
      requests.push(request);
      return reply(chunks);
    }
  };

  return { client, requests };
};

async function* reply(chunks: ChatChunk[]): AsyncGenerator<ChatChunk> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

const collect = async (deltas: AsyncIterable<string>): Promise<string[]> => {
  const collected: string[] = [];
  for await (const delta of deltas) {
    collected.push(delta);
  }
  return collected;
};

const systemPrompt = (request: ChatRequest | undefined): string =>
  request?.messages.find(message => message.role === ChatRole.System)
    ?.content ?? '';

describe('streamGroundedAnswer', () => {
  it('yields the answer as the model writes it', async () => {
    const { client } = createStubClient([
      { content: 'Blue-Eyes ', done: false },
      { content: 'fits.', done: true }
    ]);

    const deltas = await collect(
      streamGroundedAnswer({
        client,
        model: MODEL,
        request: REQUEST,
        language: Language.English,
        cards: []
      })
    );

    expect(deltas).toEqual(['Blue-Eyes ', 'fits.']);
  });

  it('yields nothing for the empty chunk a stream ends with', async () => {
    const { client } = createStubClient([
      { content: 'Answer', done: false },
      { content: '', done: true }
    ]);

    const deltas = await collect(
      streamGroundedAnswer({
        client,
        model: MODEL,
        request: REQUEST,
        language: Language.English,
        cards: []
      })
    );

    expect(deltas).toEqual(['Answer']);
  });

  it('gives the model the request to answer and the cards it may talk about', async () => {
    const cards = [createCard()];
    const { client, requests } = createStubClient([
      { content: 'ok', done: true }
    ]);

    await collect(
      streamGroundedAnswer({
        client,
        model: MODEL,
        request: REQUEST,
        language: Language.English,
        cards
      })
    );
    const [request] = requests;

    expect(request?.model).toBe(MODEL);
    expect(request?.messages.at(-1)).toEqual({
      role: ChatRole.User,
      content: REQUEST
    });
    expect(systemPrompt(request)).toContain(createCard().name);
    expect(systemPrompt(request)).not.toContain('Pot of Greed');
  });

  it('describes a card with the facts the model needs to explain it', async () => {
    const { client, requests } = createStubClient([
      { content: 'ok', done: true }
    ]);

    await collect(
      streamGroundedAnswer({
        client,
        model: MODEL,
        request: REQUEST,
        language: Language.English,
        cards: [createCard()]
      })
    );
    const prompt = systemPrompt(requests[0]);

    expect(prompt).toContain('Dragon');
    expect(prompt).toContain('Level 8');
    expect(prompt).toContain('ATK 3000');
    expect(prompt).toContain('DEF 2500');
    expect(prompt).toContain(
      'This legendary dragon is a powerful engine of destruction.'
    );
  });

  it('leaves out the facts a card does not carry', async () => {
    const talker = createCard({
      id: 1861629,
      name: 'Decode Talker',
      attribute: undefined,
      level: undefined,
      def: undefined,
      linkVal: 3,
      linkMarkers: [LinkMarker.Top]
    });
    const { client, requests } = createStubClient([
      { content: 'ok', done: true }
    ]);

    await collect(
      streamGroundedAnswer({
        client,
        model: MODEL,
        request: REQUEST,
        language: Language.English,
        cards: [talker]
      })
    );
    const prompt = systemPrompt(requests[0]);

    expect(prompt).toContain('Link 3');
    expect(prompt).not.toContain('Level');
    expect(prompt).not.toContain('DEF');
  });

  it('names the language the answer is written in', async () => {
    const { client, requests } = createStubClient([
      { content: 'ok', done: true }
    ]);

    await collect(
      streamGroundedAnswer({
        client,
        model: MODEL,
        request: REQUEST,
        language: Language.French,
        cards: [createCard()]
      })
    );

    expect(systemPrompt(requests[0])).toContain('French');
  });

  it('leaves the answer free at temperature 0 rather than schema-constrained', async () => {
    const { client, requests } = createStubClient([
      { content: 'ok', done: true }
    ]);

    await collect(
      streamGroundedAnswer({
        client,
        model: MODEL,
        request: REQUEST,
        language: Language.English,
        cards: [createCard()]
      })
    );

    expect(requests[0]?.temperature).toBe(0);
    expect(requests[0]?.format).toBeUndefined();
  });
});

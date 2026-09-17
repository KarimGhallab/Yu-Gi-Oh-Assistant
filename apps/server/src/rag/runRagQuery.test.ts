import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  type Card,
  CardAttribute,
  CardFilterField,
  type CardFilters,
  CardType,
  FilterOperator,
  FrameType,
  Language
} from '@ygo-assistant/cards';
import { TurnStatus } from '@ygo-assistant/contracts';
import { buildCardIndex } from '@ygo-assistant/db';
import type { ILogger } from '@ygo-assistant/logger';
import type { IOllamaClient, OllamaModel } from '@ygo-assistant/ollama';
import { ParseOutcome } from '@ygo-assistant/rag';
import { FakeOllamaClient, TempDataDir } from '@ygo-assistant/test-support';

import {
  type RagQueryDependencies,
  type RagQueryEvent,
  type RagQueryInput,
  runRagQuery
} from './runRagQuery.js';

const DIMENSIONS = 3;
const EMBEDDING_MODEL = 'qwen3-embedding:0.6b';
const DATASET_VERSION = 'ygoprodeck-2026-09-17';

const CHAT_MODEL: OllamaModel = {
  name: 'canned:1b',
  supportsCompletion: true,
  supportsStructuredOutput: true
};

const DRAGON_FILTER: CardFilters = [
  {
    field: CardFilterField.Race,
    operator: FilterOperator.Eq,
    value: 'Dragon'
  }
];

const PARSE_WITH_FILTER = JSON.stringify({
  filters: DRAGON_FILTER,
  query: 'high attack'
});

const PARSE_QUERY_ONLY = JSON.stringify({
  filters: [],
  query: 'high attack'
});

const DRAGON: Card = {
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
  effect: 'A legendary dragon.',
  imageUrl: 'https://images.ygoprodeck.com/images/cards/89631139.jpg',
  sourceUrl: 'https://ygoprodeck.com/card/blue-eyes-white-dragon-4001'
};

const REBORN: Card = {
  id: 83764719,
  name: 'Monster Reborn',
  language: Language.English,
  type: CardType.SpellCard,
  frameType: FrameType.Spell,
  typeLine: [],
  race: 'Normal',
  linkMarkers: [],
  effect: 'Special Summon a monster.',
  imageUrl: 'https://images.ygoprodeck.com/images/cards/83764719.jpg',
  sourceUrl: 'https://ygoprodeck.com/card/monster-reborn-7027'
};

const silentLogger: ILogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
};

const createIndexEmbedder = (vectors: number[][]): IOllamaClient => {
  let cursor = 0;
  return {
    listModels: async () => [],
    embed: async inputs => {
      const batch = vectors.slice(cursor, cursor + inputs.length);
      cursor += inputs.length;
      return batch;
    },
    chat: () => {
      throw new Error('Building the index never streams chat completions');
    }
  };
};

async function collect(
  events: AsyncGenerator<RagQueryEvent>
): Promise<RagQueryEvent[]> {
  const collected: RagQueryEvent[] = [];
  for await (const event of events) {
    collected.push(event);
  }
  return collected;
}

function searchEventOf(
  events: RagQueryEvent[]
): Extract<RagQueryEvent, { type: 'search' }> {
  const event = events.find(candidate => candidate.type === 'search');
  if (event === undefined || event.type !== 'search') {
    throw new Error('The query reported no search');
  }
  return event;
}

function rankedEventOf(
  events: RagQueryEvent[]
): Extract<RagQueryEvent, { type: 'ranked' }> {
  const event = events.find(candidate => candidate.type === 'ranked');
  if (event === undefined || event.type !== 'ranked') {
    throw new Error('The query reported no ranking');
  }
  return event;
}

function answerTextOf(events: RagQueryEvent[]): string {
  return events
    .flatMap(event => (event.type === 'answer' ? [event.text] : []))
    .join('');
}

describe('runRagQuery', () => {
  let dataDir: TempDataDir;

  beforeEach(async () => {
    dataDir = await TempDataDir.create();
    await buildCardIndex({
      dataDir: dataDir.path,
      cards: [DRAGON, REBORN],
      embedder: createIndexEmbedder([
        [1, 0, 0],
        [0, 1, 0]
      ]),
      embeddingModel: EMBEDDING_MODEL,
      dimensions: DIMENSIONS,
      datasetVersion: DATASET_VERSION
    });
  });

  afterEach(async () => {
    await dataDir.cleanup();
  });

  const dependencies = (ollama: IOllamaClient): RagQueryDependencies => ({
    logger: silentLogger,
    ollama,
    dataDir: dataDir.path
  });

  const defaultInput: RagQueryInput = {
    prompt: 'a dragon with high attack',
    language: Language.English,
    model: CHAT_MODEL.name,
    supportsStructuredOutput: true,
    parse: true,
    answer: true,
    topK: 25,
    shown: 1,
    minScore: 0
  };

  const answeringClient = (
    parseAnswer: string = PARSE_WITH_FILTER
  ): FakeOllamaClient =>
    new FakeOllamaClient({
      models: [CHAT_MODEL],
      embeddings: [[0.9, 0.4, 0]],
      chatResponses: [
        [{ content: parseAnswer, done: true }],
        [{ content: 'Blue-Eyes is the dragon you want.', done: true }]
      ]
    });

  it('reports the parse and answers from the cards it searched up', async () => {
    const ollama = answeringClient();

    const events = await collect(
      runRagQuery(dependencies(ollama), defaultInput)
    );

    const search = searchEventOf(events);
    expect(search.outcome).toBe(ParseOutcome.Parsed);
    expect(search.filters).toEqual(DRAGON_FILTER);
    expect(search.query).toBe('high attack');
    expect(search.status).toBeUndefined();

    const ranked = rankedEventOf(events);
    expect(ranked.ranked.map(candidate => candidate.card.name)).toEqual([
      'Blue-Eyes White Dragon'
    ]);
    expect(ranked.ranked[0].score).toBeGreaterThan(0);

    expect(answerTextOf(events)).toBe('Blue-Eyes is the dragon you want.');
  });

  it('ranks every candidate the search returns and answers from the shown ones', async () => {
    const ollama = answeringClient(PARSE_QUERY_ONLY);

    const events = await collect(
      runRagQuery(dependencies(ollama), defaultInput)
    );

    const ranked = rankedEventOf(events);
    expect(ranked.ranked.map(candidate => candidate.card.name)).toEqual([
      'Blue-Eyes White Dragon',
      'Monster Reborn'
    ]);
    expect(ranked.ranked[0].score).toBeGreaterThan(ranked.ranked[1].score);

    const answerRequest = ollama.chatRequests.at(-1);
    expect(answerRequest?.messages[0].content).toContain(
      'Blue-Eyes White Dragon'
    );
    expect(answerRequest?.messages[0].content).not.toContain('Monster Reborn');
  });

  it('searches the request as free text when the parse is skipped', async () => {
    const ollama = answeringClient();

    const events = await collect(
      runRagQuery(dependencies(ollama), { ...defaultInput, parse: false })
    );

    const search = searchEventOf(events);
    expect(search.outcome).toBeUndefined();
    expect(search.filters).toEqual([]);
    expect(search.query).toBe(defaultInput.prompt);
    expect(ollama.chatRequests).toHaveLength(1);
  });

  it('takes the edited filters at their word instead of parsing', async () => {
    const ollama = answeringClient();

    const events = await collect(
      runRagQuery(dependencies(ollama), {
        ...defaultInput,
        editedFilters: DRAGON_FILTER
      })
    );

    const search = searchEventOf(events);
    expect(search.outcome).toBeUndefined();
    expect(search.filters).toEqual(DRAGON_FILTER);
    expect(search.query).toBe(defaultInput.prompt);
    expect(ollama.chatRequests).toHaveLength(1);
  });

  it('stops after the ranking when the answer is not wanted', async () => {
    const ollama = answeringClient();

    const events = await collect(
      runRagQuery(dependencies(ollama), { ...defaultInput, answer: false })
    );

    expect(events.map(event => event.type)).toEqual(['search', 'ranked']);
    expect(ollama.chatRequests).toHaveLength(1);
  });

  it('falls back to the request text when the parse gives up', async () => {
    const ollama = new FakeOllamaClient({
      models: [CHAT_MODEL],
      embeddings: [[0.9, 0.4, 0]],
      chatResponses: [
        [{ content: 'not json', done: true }],
        [{ content: 'still not json', done: true }],
        [{ content: 'The dragon.', done: true }]
      ]
    });

    const events = await collect(
      runRagQuery(dependencies(ollama), defaultInput)
    );

    const search = searchEventOf(events);
    expect(search.outcome).toBe(ParseOutcome.Degraded);
    expect(search.filters).toEqual([]);
    expect(search.query).toBe(defaultInput.prompt);
    expect(search.status).toBe(TurnStatus.FreeTextOnly);
    expect(answerTextOf(events)).toBe('The dragon.');
  });

  it('answers with the canned reply when the ranking is empty', async () => {
    const ollama = new FakeOllamaClient({
      models: [CHAT_MODEL],
      embeddings: [[0, 0, 1]],
      chatResponses: [[{ content: PARSE_QUERY_ONLY, done: true }]]
    });

    const events = await collect(
      runRagQuery(dependencies(ollama), { ...defaultInput, minScore: 0.5 })
    );

    expect(rankedEventOf(events).ranked).toEqual([]);
    expect(answerTextOf(events)).toBe(
      'I could not find a card that matches that request. Try broadening it.'
    );
    expect(ollama.chatRequests).toHaveLength(1);
  });
});

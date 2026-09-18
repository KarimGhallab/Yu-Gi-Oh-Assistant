import { describe, expect, it } from 'vitest';

import {
  type Card,
  CardAttribute,
  CardFilterField,
  type CardFilters,
  CardRace,
  CardType,
  FilterOperator,
  FrameType,
  Language
} from '@ygo-assistant/cards';
import { TurnStage, TurnStatus } from '@ygo-assistant/contracts';
import { InMemoryCardCatalog } from '@ygo-assistant/db/testing';
import type { ILogger } from '@ygo-assistant/logger';
import {
  type IOllamaClient,
  type OllamaModel,
  OllamaUnreachableError
} from '@ygo-assistant/ollama';
import { ParseOutcome } from '@ygo-assistant/rag';
import { FakeOllamaClient } from '@ygo-assistant/test-support';

import {
  type PipelineDependencies,
  PipelineError,
  type PipelineEvent,
  type PipelineInput,
  runPipeline
} from './runPipeline.js';

const BASE_URL = 'http://127.0.0.1:11434';

const CHAT_MODEL: OllamaModel = {
  name: 'canned:1b',
  supportsCompletion: true,
  supportsStructuredOutput: true
};

const DRAGON_FILTER: CardFilters = [
  {
    field: CardFilterField.Race,
    operator: FilterOperator.Eq,
    value: CardRace.Dragon
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

async function collect(
  events: AsyncGenerator<PipelineEvent>
): Promise<PipelineEvent[]> {
  const collected: PipelineEvent[] = [];
  for await (const event of events) {
    collected.push(event);
  }
  return collected;
}

async function captureError(operation: Promise<unknown>): Promise<Error> {
  try {
    await operation;
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
    throw error;
  }
  throw new Error('Expected the pipeline to reject');
}

function searchEventOf(
  events: PipelineEvent[]
): Extract<PipelineEvent, { type: 'search' }> {
  const event = events.find(candidate => candidate.type === 'search');
  if (event === undefined || event.type !== 'search') {
    throw new Error('The pipeline reported no search');
  }
  return event;
}

function selectedEventOf(
  events: PipelineEvent[]
): Extract<PipelineEvent, { type: 'selected' }> {
  const event = events.find(candidate => candidate.type === 'selected');
  if (event === undefined || event.type !== 'selected') {
    throw new Error('The pipeline reported no selection');
  }
  return event;
}

function rankedEventOf(
  events: PipelineEvent[]
): Extract<PipelineEvent, { type: 'ranked' }> {
  const event = events.find(candidate => candidate.type === 'ranked');
  if (event === undefined || event.type !== 'ranked') {
    throw new Error('The pipeline reported no ranking');
  }
  return event;
}

function answerTextOf(events: PipelineEvent[]): string {
  return events
    .flatMap(event => (event.type === 'answer' ? [event.text] : []))
    .join('');
}

describe('runPipeline', () => {
  const catalog = new InMemoryCardCatalog({
    rows: [
      { ...DRAGON, vector: [1, 0, 0] },
      { ...REBORN, vector: [0, 1, 0] },
      {
        ...DRAGON,
        language: Language.French,
        name: 'Dragon Blanc aux Yeux Bleus',
        vector: [1, 0, 0]
      }
    ]
  });

  const dependencies = (ollama: IOllamaClient): PipelineDependencies => ({
    logger: silentLogger,
    ollama,
    catalog
  });

  const defaultInput: PipelineInput = {
    request: 'a dragon with high attack',
    language: Language.English,
    model: CHAT_MODEL.name,
    supportsStructuredOutput: true,
    parse: true,
    answer: true,
    filter: true,
    ranking: { topK: 25, minScore: 0 },
    pool: 25,
    shown: 1
  };

  /**
   * What the judgement answers unless a test says otherwise: both cards the
   * catalog holds, so what is shown is the ranking's own top.
   */
  const KEEPS_EVERYTHING = {
    content: JSON.stringify({ keep: [DRAGON.id, REBORN.id] }),
    done: true
  };

  const answeringClient = (
    parseAnswer: string = PARSE_WITH_FILTER,
    judgement: { content: string; done: boolean } = KEEPS_EVERYTHING
  ): FakeOllamaClient =>
    new FakeOllamaClient({
      models: [CHAT_MODEL],
      embeddings: [[0.9, 0.4, 0]],
      chatResponses: [
        [{ content: parseAnswer, done: true }],
        [judgement],
        [{ content: 'Blue-Eyes is the dragon you want.', done: true }]
      ]
    });

  it('reports the parse and answers from the cards it searched up', async () => {
    const ollama = answeringClient();

    const events = await collect(
      runPipeline(dependencies(ollama), defaultInput)
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

  it('embeds the query the parse rewrote the request into', async () => {
    const ollama = answeringClient();

    await collect(runPipeline(dependencies(ollama), defaultInput));

    expect(ollama.embeddedInputs).toEqual([['high attack']]);
  });

  it('ranks every candidate the search returns and answers from the shown ones', async () => {
    const ollama = answeringClient(PARSE_QUERY_ONLY);

    const events = await collect(
      runPipeline(dependencies(ollama), defaultInput)
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

  it('shows the cards the judgement kept', async () => {
    const ollama = answeringClient(PARSE_QUERY_ONLY, {
      content: JSON.stringify({ keep: [REBORN.id] }),
      done: true
    });

    const events = await collect(
      runPipeline(dependencies(ollama), defaultInput)
    );

    expect(selectedEventOf(events).cards.map(card => card.name)).toEqual([
      'Monster Reborn'
    ]);

    const answerRequest = ollama.chatRequests.at(-1);
    expect(answerRequest?.messages[0].content).toContain('Monster Reborn');
    expect(answerRequest?.messages[0].content).not.toContain(
      'Blue-Eyes White Dragon'
    );
  });

  it('falls back to the search own ranking when the judgement fails', async () => {
    const ollama = answeringClient(PARSE_QUERY_ONLY, {
      content: 'I would keep Blue-Eyes.',
      done: true
    });

    const events = await collect(
      runPipeline(dependencies(ollama), defaultInput)
    );
    const selected = selectedEventOf(events);

    expect(selected.fellBack).toBe(true);
    expect(selected.cards.map(card => card.name)).toEqual([
      'Blue-Eyes White Dragon'
    ]);
  });

  it('judges the candidates against the request the player wrote', async () => {
    const ollama = answeringClient();

    await collect(runPipeline(dependencies(ollama), defaultInput));

    expect(ollama.chatRequests[1]?.messages[1]?.content).toBe(
      defaultInput.request
    );
    expect(ollama.chatRequests[1]?.format).toBeDefined();
  });

  it('constrains the parse and the judgement but never the answer', async () => {
    const ollama = answeringClient();

    await collect(runPipeline(dependencies(ollama), defaultInput));

    expect(ollama.chatRequests).toHaveLength(3);
    expect(ollama.chatRequests[0]?.model).toBe(CHAT_MODEL.name);
    expect(ollama.chatRequests[0]?.format).toBeDefined();
    expect(ollama.chatRequests[1]?.format).toBeDefined();
    expect(ollama.chatRequests[2]?.format).toBeUndefined();
    expect(ollama.chatRequests[2]?.messages[0]?.content).toContain(DRAGON.name);
  });

  it('shows the search own top when no judgement is asked for', async () => {
    const ollama = answeringClient();

    const events = await collect(
      runPipeline(dependencies(ollama), { ...defaultInput, filter: false })
    );

    const selected = selectedEventOf(events);
    expect(selected.pool).toBe(0);
    expect(selected.cards.map(card => card.name)).toEqual([
      'Blue-Eyes White Dragon'
    ]);
    // The parse and the answer, with nothing asked in between.
    expect(ollama.chatRequests).toHaveLength(2);
  });

  it('searches the request as free text when the parse is skipped', async () => {
    const ollama = answeringClient();

    const events = await collect(
      runPipeline(dependencies(ollama), { ...defaultInput, parse: false })
    );

    const search = searchEventOf(events);
    expect(search.outcome).toBeUndefined();
    expect(search.filters).toEqual([]);
    expect(search.query).toBe(defaultInput.request);
    expect(ollama.chatRequests).toHaveLength(2);
  });

  it('takes the edited filters at their word instead of parsing', async () => {
    const ollama = answeringClient();

    const events = await collect(
      runPipeline(dependencies(ollama), {
        ...defaultInput,
        editedFilters: DRAGON_FILTER
      })
    );

    const search = searchEventOf(events);
    expect(search.outcome).toBeUndefined();
    expect(search.filters).toEqual(DRAGON_FILTER);
    expect(search.query).toBe(defaultInput.request);
    expect(ollama.chatRequests).toHaveLength(2);
  });

  it('searches the request itself when the parse names nothing', async () => {
    const ollama = answeringClient(JSON.stringify({}));

    const events = await collect(
      runPipeline(dependencies(ollama), defaultInput)
    );

    const search = searchEventOf(events);
    expect(search.outcome).toBe(ParseOutcome.Parsed);
    expect(search.filters).toEqual([]);
    expect(search.query).toBe(defaultInput.request);
    expect(search.status).toBe(TurnStatus.FreeTextOnly);
  });

  it('stays inside the requested language partition', async () => {
    const ollama = answeringClient(PARSE_QUERY_ONLY);

    const events = await collect(
      runPipeline(dependencies(ollama), {
        ...defaultInput,
        language: Language.French
      })
    );

    expect(
      rankedEventOf(events).ranked.map(candidate => candidate.card.name)
    ).toEqual(['Dragon Blanc aux Yeux Bleus']);
  });

  it('stops after the ranking and the judgement when the answer is not wanted', async () => {
    const ollama = answeringClient();

    const events = await collect(
      runPipeline(dependencies(ollama), { ...defaultInput, answer: false })
    );

    expect(events.map(event => event.type)).toEqual([
      'search',
      'ranked',
      'selected'
    ]);
    expect(ollama.chatRequests).toHaveLength(2);
  });

  it('falls back to the request text when the parse gives up', async () => {
    const ollama = new FakeOllamaClient({
      models: [CHAT_MODEL],
      embeddings: [[0.9, 0.4, 0]],
      chatResponses: [
        [{ content: 'not json', done: true }],
        [{ content: 'still not json', done: true }],
        [KEEPS_EVERYTHING],
        [{ content: 'The dragon.', done: true }]
      ]
    });

    const events = await collect(
      runPipeline(dependencies(ollama), defaultInput)
    );

    const search = searchEventOf(events);
    expect(search.outcome).toBe(ParseOutcome.Degraded);
    expect(search.filters).toEqual([]);
    expect(search.query).toBe(defaultInput.request);
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
      runPipeline(dependencies(ollama), {
        ...defaultInput,
        ranking: { topK: 25, minScore: 0.5 }
      })
    );

    expect(rankedEventOf(events).ranked).toEqual([]);
    expect(answerTextOf(events)).toBe(
      'I could not find a card that matches that request. Try broadening it.'
    );
    expect(ollama.chatRequests).toHaveLength(1);
  });

  it('answers the empty search in the conversation language', async () => {
    const ollama = new FakeOllamaClient({
      models: [CHAT_MODEL],
      embeddings: [[0, 0, 1]],
      chatResponses: [[{ content: PARSE_QUERY_ONLY, done: true }]]
    });

    const events = await collect(
      runPipeline(dependencies(ollama), {
        ...defaultInput,
        language: Language.French,
        ranking: { topK: 25, minScore: 0.5 }
      })
    );

    expect(answerTextOf(events)).toContain('aucune carte');
  });

  describe('failures', () => {
    it('tags a parse failure with the parse stage', async () => {
      const ollama = new FakeOllamaClient({
        models: [CHAT_MODEL],
        embeddings: [[0.9, 0.4, 0]],
        chatResponses: [[]],
        chatFailures: [new Error('connection refused')]
      });

      const error = await captureError(
        collect(runPipeline(dependencies(ollama), defaultInput))
      );

      expect(error).toBeInstanceOf(PipelineError);
      expect((error as PipelineError).stage).toBe(TurnStage.Parse);
      expect((error as PipelineError).cause).toBeInstanceOf(Error);
    });

    it('tags a retrieval failure with the search stage', async () => {
      const ollama: IOllamaClient = {
        listModels: async () => [CHAT_MODEL],
        embed: async () => {
          throw new OllamaUnreachableError(BASE_URL);
        },
        chat: async function* chatForTheParse() {
          yield { content: PARSE_QUERY_ONLY, done: true };
        }
      };

      const error = await captureError(
        collect(runPipeline(dependencies(ollama), defaultInput))
      );

      expect(error).toBeInstanceOf(PipelineError);
      expect((error as PipelineError).stage).toBe(TurnStage.Search);
      expect((error as PipelineError).cause).toBeInstanceOf(
        OllamaUnreachableError
      );
    });

    it('tags an answer failure with the answer stage', async () => {
      const ollama = new FakeOllamaClient({
        models: [CHAT_MODEL],
        embeddings: [[0.9, 0.4, 0]],
        chatResponses: [
          [{ content: PARSE_WITH_FILTER, done: true }],
          [KEEPS_EVERYTHING],
          [{ content: 'Blue-Eyes ', done: false }]
        ],
        chatFailures: [
          undefined,
          undefined,
          new OllamaUnreachableError(BASE_URL)
        ]
      });

      const error = await captureError(
        collect(runPipeline(dependencies(ollama), defaultInput))
      );

      expect(error).toBeInstanceOf(PipelineError);
      expect((error as PipelineError).stage).toBe(TurnStage.Answer);
      expect((error as PipelineError).cause).toBeInstanceOf(
        OllamaUnreachableError
      );
    });
  });
});

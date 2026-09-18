import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
import {
  type TurnEvent,
  TurnEventName,
  TurnStage,
  conversationWithMessagesSchema,
  turnEventSchema
} from '@ygo-assistant/contracts';
import {
  type IAppStore,
  MessageRole,
  databasePath,
  openAppStore
} from '@ygo-assistant/db';
import { InMemoryCardCatalog } from '@ygo-assistant/db/testing';
import type { ILogger, LogContext } from '@ygo-assistant/logger';
import type {
  ChatChunk,
  IOllamaClient,
  OllamaModel
} from '@ygo-assistant/ollama';
import { OllamaUnreachableError } from '@ygo-assistant/ollama';
import { FakeOllamaClient } from '@ygo-assistant/test-support';

import { loadConfig } from '../../config/index.js';
import { createServer } from '../createServer.js';

const DIMENSIONS = 3;
const EMBEDDING_MODEL = 'nomic-embed-text:latest';
const CHAT_MODEL = 'llama3.1:8b';
const BASE_URL = 'http://127.0.0.1:11434';
const REQUEST = 'light monsters that banish cards';
const QUERY_VECTOR = [1, 0, 0];

/** An id no conversation has, in the shape the API hands out. */
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

const LIGHT_FILTERS: CardFilters = [
  {
    field: CardFilterField.Attribute,
    operator: FilterOperator.Eq,
    value: CardAttribute.Light
  }
];

const PARSE_ANSWER = JSON.stringify({
  filters: LIGHT_FILTERS,
  query: 'banish cards'
});

const PROSE: ChatChunk[] = [
  { content: 'Blue-Eyes ', done: false },
  { content: 'fits.', done: true }
];

const CHAT_MODEL_CAPABILITY: OllamaModel = {
  name: CHAT_MODEL,
  supportsCompletion: true,
  supportsStructuredOutput: true
};

const createCard = (id: number, overrides: Partial<Card> = {}): Card => ({
  id,
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

const CREATED_IDS: Card[] = [
  createCard(1),
  createCard(2, { name: 'Luster Dragon' }),
  createCard(3, {
    name: 'Red-Eyes Black Dragon',
    attribute: CardAttribute.Dark
  }),
  createCard(4, { name: 'Magicien Sombre', language: Language.French })
];

/**
 * What the filter answers when a test is not about the judgement: every card
 * the index holds, so what a turn shows is the ranking's own top.
 */
const KEEP_EVERYTHING: ChatChunk = {
  content: JSON.stringify({ keep: CREATED_IDS.map(card => card.id) }),
  done: true
};

/**
 * One vector per seeded card. The first is the best match for a request, so the
 * card shown for a search is predictable; the French one is deliberately a worse
 * match than the English one, so a search that ignored the language and returned
 * it anyway would be caught rather than passed off as a tie-break.
 */
const SEED_VECTORS = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [0, 1, 0]
];

const silentLogger: ILogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
};

interface LogRecord {
  level: string;
  message: string;
  context: LogContext | undefined;
}

const createRecordingLogger = (): {
  logger: ILogger;
  records: LogRecord[];
} => {
  const records: LogRecord[] = [];
  const record =
    (level: string) =>
    (message: string, context?: LogContext): void => {
      records.push({ level, message, context });
    };

  return {
    logger: {
      debug: record('debug'),
      info: record('info'),
      warn: record('warn'),
      error: record('error')
    },
    records
  };
};

interface Frame {
  name: string;
  event: TurnEvent;
}

const readLine = (frame: string, prefix: string): string =>
  (frame.split('\n').find(line => line.startsWith(prefix)) ?? '').slice(
    prefix.length
  );

const readFrames = (body: string): Frame[] =>
  body
    .split('\n\n')
    .filter(frame => frame.trim().length > 0)
    .map(frame => ({
      name: readLine(frame, 'event: '),
      event: turnEventSchema.parse(JSON.parse(readLine(frame, 'data: ')))
    }));

const eventNames = (frames: Frame[]): string[] =>
  frames.map(frame => frame.event.type);

const shownCardNames = (frames: Frame[]): string[] =>
  frames.flatMap(frame =>
    frame.event.type === TurnEventName.Cards
      ? frame.event.cards.map(card => card.name)
      : []
  );

const answerText = (frames: Frame[]): string =>
  frames
    .flatMap(frame =>
      frame.event.type === TurnEventName.AnswerDelta ? [frame.event.text] : []
    )
    .join('');

const filtersEvents = (frames: Frame[]): TurnEvent[] =>
  frames
    .filter(frame => frame.event.type === TurnEventName.Filters)
    .map(frame => frame.event);

/** The failure records, told apart from the request log by the stage they name. */
const turnRecords = (records: LogRecord[]): LogRecord[] =>
  records.filter(record => record.context?.stage !== undefined);

describe('turn routes', () => {
  let dataDir: string;
  let store: IAppStore;
  let catalog: InMemoryCardCatalog;

  const createDataDir = async (): Promise<string> => {
    dataDir = await mkdtemp(join(tmpdir(), 'ygo-assistant-turn-'));
    return dataDir;
  };

  const createClient = (
    parseAnswers: string | string[],
    prose: ChatChunk[] = PROSE,
    models: OllamaModel[] = [CHAT_MODEL_CAPABILITY]
  ): FakeOllamaClient => {
    const answers = Array.isArray(parseAnswers) ? parseAnswers : [parseAnswers];

    return new FakeOllamaClient({
      models,
      embeddings: [QUERY_VECTOR],
      chatResponses: [
        ...answers.map(answer => [{ content: answer, done: true }]),
        // The filter judges the search's candidates between the parse and the
        // answer. A test that is not about the judgement keeps every seeded
        // card, so what is shown is the ranking's own top, as before.
        [KEEP_EVERYTHING],
        prose
      ]
    });
  };

  const app = (client: IOllamaClient, logger: ILogger = silentLogger) =>
    createServer({
      config: loadConfig({
        DATA_DIR: dataDir,
        OLLAMA_EMBEDDING_MODEL: EMBEDDING_MODEL,
        OLLAMA_EMBEDDING_DIMENSIONS: String(DIMENSIONS),
        RETRIEVAL_TOP_K: '10',
        RETRIEVAL_MAX_SHOWN: '1'
      }),
      logger,
      ollama: client,
      store,
      catalog
    });

  const postTurn = async (
    client: IOllamaClient,
    id: string,
    body: unknown = { text: REQUEST },
    logger: ILogger = silentLogger
  ): Promise<Response> =>
    app(client, logger).request(`/api/conversations/${id}/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });

  const runTurn = async (
    client: IOllamaClient,
    id: string,
    body: unknown = { text: REQUEST },
    logger: ILogger = silentLogger
  ): Promise<Frame[]> =>
    readFrames(await (await postTurn(client, id, body, logger)).text());

  const startConversation = (language = Language.English): Promise<string> =>
    store.conversations
      .create({ title: 'Toolbox', language, model: CHAT_MODEL })
      .then(conversation => conversation.id);

  beforeEach(async () => {
    await createDataDir();
    store = await openAppStore(databasePath(dataDir));
    catalog = new InMemoryCardCatalog({
      rows: CREATED_IDS.map((card, index) => ({
        ...card,
        vector: SEED_VECTORS[index]
      }))
    });
  });

  afterEach(async () => {
    await store.close();
    await rm(dataDir, { recursive: true, force: true });
  });

  it('streams a turn in order and stores it', async () => {
    const client = createClient(PARSE_ANSWER);
    const conversationId = await startConversation();

    const response = await postTurn(client, conversationId);

    expect(response.status).toBe(200);
    const frames = readFrames(await response.text());
    const names = eventNames(frames);

    expect(names).toEqual([
      TurnEventName.TurnStart,
      TurnEventName.Filters,
      TurnEventName.Cards,
      TurnEventName.AnswerDelta,
      TurnEventName.AnswerDelta,
      TurnEventName.AnswerEnd,
      TurnEventName.TurnEnd
    ]);
    expect(frames.map(frame => frame.name)).toEqual(names);
    expect(names.indexOf(TurnEventName.TurnStart)).toBe(0);
    expect(names.indexOf(TurnEventName.Filters)).toBeLessThan(
      names.indexOf(TurnEventName.Cards)
    );
    expect(names.indexOf(TurnEventName.Cards)).toBeLessThan(
      names.indexOf(TurnEventName.AnswerDelta)
    );
    expect(names.indexOf(TurnEventName.AnswerEnd)).toBeLessThan(
      names.indexOf(TurnEventName.TurnEnd)
    );

    const messages = await store.messages.list(conversationId);
    expect(messages.map(message => message.role)).toEqual([
      MessageRole.User,
      MessageRole.Assistant
    ]);
    expect(frames[0]?.event).toEqual({
      type: TurnEventName.TurnStart,
      userMessageId: messages[0]?.id
    });
    expect(filtersEvents(frames)).toEqual([
      {
        type: TurnEventName.Filters,
        filters: LIGHT_FILTERS,
        query: 'banish cards'
      }
    ]);
    expect(shownCardNames(frames)).toEqual(['Blue-Eyes White Dragon']);
    expect(answerText(frames)).toBe('Blue-Eyes fits.');
    expect(frames.at(-1)?.event).toEqual({
      type: TurnEventName.TurnEnd,
      messageId: messages[1]?.id
    });
    expect(messages[1]).toMatchObject({
      conversationId,
      content: 'Blue-Eyes fits.',
      filters: LIGHT_FILTERS,
      cardIds: [CREATED_IDS[0]?.id]
    });
  });

  it('reopens the conversation with the stored turn', async () => {
    const client = createClient(PARSE_ANSWER);
    const conversationId = await startConversation();

    await runTurn(client, conversationId);
    const response = await app(client).request(
      `/api/conversations/${conversationId}`
    );
    const conversation = conversationWithMessagesSchema.parse(
      await response.json()
    );

    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages[0]).toMatchObject({
      role: 'user',
      content: REQUEST
    });
    expect(conversation.messages[0]?.cards).toBeUndefined();
    expect(conversation.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'Blue-Eyes fits.',
      filters: LIGHT_FILTERS,
      cards: [
        {
          id: CREATED_IDS[0]?.id,
          name: 'Blue-Eyes White Dragon',
          imageUrl: 'https://images.ygoprodeck.com/images/cards/89631139.jpg',
          sourceUrl: 'https://ygoprodeck.com/card/blue-eyes-white-dragon-4002'
        }
      ]
    });
  });

  it('stores what it searched when the parse gave up', async () => {
    const client = createClient(['not JSON', 'still not JSON']);
    const conversationId = await startConversation();

    await runTurn(client, conversationId);

    const response = await app(client).request(
      `/api/conversations/${conversationId}`
    );
    const conversation = conversationWithMessagesSchema.parse(
      await response.json()
    );

    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages[0]).toMatchObject({
      role: 'user',
      content: REQUEST
    });
    expect(conversation.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'Blue-Eyes fits.',
      filters: [],
      cards: [{ id: CREATED_IDS[0]?.id, name: 'Blue-Eyes White Dragon' }]
    });
    // The search ran on the player's own words, so there is no rewrite to keep.
    expect(conversation.messages[0]?.query).toBeUndefined();
  });

  it('keeps the free text the parse rewrote the request into', async () => {
    const client = createClient(PARSE_ANSWER);
    const conversationId = await startConversation();

    await runTurn(client, conversationId);

    const response = await app(client).request(
      `/api/conversations/${conversationId}`
    );
    const conversation = conversationWithMessagesSchema.parse(
      await response.json()
    );

    expect(conversation.messages[0]).toMatchObject({
      role: 'user',
      content: REQUEST,
      query: 'banish cards'
    });
  });

  it('searches the language the player chose and keeps it on the conversation', async () => {
    const client = createClient(PARSE_ANSWER);
    const conversationId = await startConversation();

    const frames = await runTurn(client, conversationId, {
      text: REQUEST,
      language: Language.French
    });

    expect(shownCardNames(frames)).toEqual(['Magicien Sombre']);
    await expect(
      store.conversations.find(conversationId)
    ).resolves.toMatchObject({ language: Language.French });
  });

  it('answers with the model the player chose and keeps it on the conversation', async () => {
    const chosen: OllamaModel = {
      name: 'mistral:7b',
      supportsCompletion: true,
      supportsStructuredOutput: true
    };
    const client = createClient(PARSE_ANSWER, PROSE, [
      CHAT_MODEL_CAPABILITY,
      chosen
    ]);
    const conversationId = await startConversation();

    await runTurn(client, conversationId, {
      text: REQUEST,
      model: chosen.name
    });

    expect(client.chatRequests.map(request => request.model)).toEqual([
      chosen.name,
      chosen.name,
      chosen.name
    ]);
    await expect(
      store.conversations.find(conversationId)
    ).resolves.toMatchObject({
      model: chosen.name,
      language: Language.English
    });
  });

  it('refuses a model that is not installed before it streams', async () => {
    const client = createClient(PARSE_ANSWER);
    const conversationId = await startConversation();

    const response = await postTurn(client, conversationId, {
      text: REQUEST,
      model: 'ghost:latest'
    });

    expect(response.status).toBe(404);
    expect(await response.text()).toContain('ghost:latest');
    expect(client.chatRequests).toEqual([]);
    await expect(
      store.conversations.find(conversationId)
    ).resolves.toMatchObject({ model: CHAT_MODEL });
    await expect(store.messages.list(conversationId)).resolves.toEqual([]);
  });

  it('refuses a turn it cannot prepare because Ollama is unreachable', async () => {
    const client: IOllamaClient = {
      listModels: async () => {
        throw new OllamaUnreachableError(BASE_URL);
      },
      embed: async () => [],
      chat: () => {
        throw new Error('A turn that cannot list models never answers');
      }
    };
    const conversationId = await startConversation();

    const response = await postTurn(client, conversationId);

    expect(response.status).toBe(503);
    expect(await store.messages.list(conversationId)).toEqual([]);
  });

  it('refuses a request that says nothing', async () => {
    const client = createClient(PARSE_ANSWER);

    const response = await postTurn(client, await startConversation(), {
      text: '   '
    });

    expect(response.status).toBe(400);
    expect(client.chatRequests).toEqual([]);
  });

  it('refuses a conversation whose model is not installed', async () => {
    const client = createClient(PARSE_ANSWER, PROSE, []);
    const conversationId = await startConversation();

    const response = await postTurn(client, conversationId);

    expect(response.status).toBe(404);
    expect(client.chatRequests).toEqual([]);
  });

  it('answers without the model when the search found nothing', async () => {
    const client = createClient(
      JSON.stringify({
        filters: [
          {
            field: CardFilterField.Race,
            operator: FilterOperator.Eq,
            value: CardRace.DivineBeast
          }
        ]
      })
    );
    const conversationId = await startConversation();

    const frames = await runTurn(client, conversationId);
    const answer = answerText(frames);

    expect(client.chatRequests).toHaveLength(1);
    expect(answer).toContain('could not find a card');
    expect(
      frames.find(frame => frame.event.type === TurnEventName.Cards)?.event
    ).toEqual({ type: TurnEventName.Cards, cards: [] });

    const response = await app(client).request(
      `/api/conversations/${conversationId}`
    );
    const conversation = conversationWithMessagesSchema.parse(
      await response.json()
    );

    expect(conversation.messages[1]).toMatchObject({
      role: 'assistant',
      content: answer,
      cards: []
    });
  });

  it('fails the turn when the model dies partway through the answer', async () => {
    const client = new FakeOllamaClient({
      models: [CHAT_MODEL_CAPABILITY],
      embeddings: [QUERY_VECTOR],
      chatResponses: [
        [{ content: PARSE_ANSWER, done: true }],
        [KEEP_EVERYTHING],
        [
          { content: 'Blue-Eyes ', done: false },
          { content: 'fits', done: false }
        ]
      ],
      chatFailures: [undefined, undefined, new OllamaUnreachableError(BASE_URL)]
    });
    const { logger, records } = createRecordingLogger();
    const conversationId = await startConversation();

    const frames = await runTurn(client, conversationId, undefined, logger);

    expect(eventNames(frames)).toEqual([
      TurnEventName.TurnStart,
      TurnEventName.Filters,
      TurnEventName.Cards,
      TurnEventName.AnswerDelta,
      TurnEventName.AnswerDelta,
      TurnEventName.Error
    ]);
    expect(frames.at(-1)?.event).toMatchObject({
      stage: TurnStage.Answer,
      message: expect.stringContaining('unreachable')
    });
    const failures = turnRecords(records);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      level: 'warn',
      context: { conversationId, stage: TurnStage.Answer }
    });

    const response = await app(client).request(
      `/api/conversations/${conversationId}`
    );
    const conversation = conversationWithMessagesSchema.parse(
      await response.json()
    );

    expect(conversation.messages.map(message => message.role)).toEqual([
      'user'
    ]);
  });

  it('fails the turn when the model answers with nothing at all', async () => {
    const client = new FakeOllamaClient({
      models: [CHAT_MODEL_CAPABILITY],
      embeddings: [QUERY_VECTOR],
      chatResponses: [
        [{ content: PARSE_ANSWER, done: true }],
        [KEEP_EVERYTHING],
        []
      ]
    });
    const { logger, records } = createRecordingLogger();
    const conversationId = await startConversation();

    const frames = await runTurn(client, conversationId, undefined, logger);

    expect(eventNames(frames)).toEqual([
      TurnEventName.TurnStart,
      TurnEventName.Filters,
      TurnEventName.Cards,
      TurnEventName.Error
    ]);
    expect(frames.at(-1)?.event).toMatchObject({
      stage: TurnStage.Answer,
      message: 'The turn failed'
    });
    expect(turnRecords(records)[0]).toMatchObject({
      level: 'error',
      context: { conversationId, stage: TurnStage.Answer }
    });

    const messages = await store.messages.list(conversationId);
    expect(messages.map(message => message.role)).toEqual([MessageRole.User]);
  });

  it('fails the turn when the parse cannot reach the model', async () => {
    const client = new FakeOllamaClient({
      models: [CHAT_MODEL_CAPABILITY],
      embeddings: [QUERY_VECTOR],
      chatResponses: [[]],
      chatFailures: [new Error('connection refused')]
    });
    const { logger, records } = createRecordingLogger();
    const conversationId = await startConversation();

    const frames = await runTurn(client, conversationId, undefined, logger);

    expect(eventNames(frames)).toEqual([
      TurnEventName.TurnStart,
      TurnEventName.Error
    ]);
    expect(frames.at(-1)?.event).toEqual({
      type: TurnEventName.Error,
      stage: TurnStage.Parse,
      message: 'The turn failed'
    });
    const failures = turnRecords(records);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      level: 'error',
      context: { conversationId, stage: TurnStage.Parse }
    });
    expect(failures[0]?.context?.message).toContain('connection refused');

    const messages = await store.messages.list(conversationId);
    expect(messages.map(message => message.role)).toEqual([MessageRole.User]);
  });

  it('fails the turn when the search cannot run', async () => {
    const client: IOllamaClient = {
      listModels: async () => [CHAT_MODEL_CAPABILITY],
      embed: async () => {
        throw new OllamaUnreachableError(BASE_URL);
      },
      chat: async function* chatForTheParse() {
        yield { content: PARSE_ANSWER, done: true };
      }
    };
    const { logger, records } = createRecordingLogger();
    const conversationId = await startConversation();

    const frames = await runTurn(client, conversationId, undefined, logger);

    expect(eventNames(frames)).toEqual([
      TurnEventName.TurnStart,
      TurnEventName.Filters,
      TurnEventName.Error
    ]);
    expect(frames.at(-1)?.event).toMatchObject({
      stage: TurnStage.Search,
      message: expect.stringContaining('unreachable')
    });
    expect(turnRecords(records)[0]).toMatchObject({
      level: 'warn',
      context: { conversationId, stage: TurnStage.Search }
    });

    const messages = await store.messages.list(conversationId);
    expect(messages.map(message => message.role)).toEqual([MessageRole.User]);
  });

  it('refuses a body that does not parse before it streams', async () => {
    const client = createClient(PARSE_ANSWER);

    const response = await postTurn(client, await startConversation(), {});

    expect(response.status).toBe(400);
    expect(await response.text()).toContain('text');
    expect(client.chatRequests).toEqual([]);
  });

  it('refuses a conversation that does not exist before it streams', async () => {
    const client = createClient(PARSE_ANSWER);

    const response = await postTurn(client, MISSING_ID);

    expect(response.status).toBe(404);
    expect(client.chatRequests).toEqual([]);
  });
});

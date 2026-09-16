import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
import {
  type TurnEvent,
  TurnEventName,
  TurnStage,
  TurnStatus,
  conversationWithMessagesSchema,
  turnEventSchema
} from '@ygo-assistant/contracts';
import {
  type IAppStore,
  MessageRole,
  buildCardIndex,
  databasePath,
  openAppStore
} from '@ygo-assistant/db';
import type { ILogger, LogContext } from '@ygo-assistant/logger';
import type {
  ChatChunk,
  IOllamaClient,
  OllamaModel
} from '@ygo-assistant/ollama';
import { OllamaUnreachableError } from '@ygo-assistant/ollama';
import { FakeOllamaClient } from '@ygo-assistant/test-support';

import { loadConfig } from '../../config/index.js';
import { createServer } from '../server.js';

const DIMENSIONS = 3;
const EMBEDDING_MODEL = 'nomic-embed-text:latest';
const CHAT_MODEL = 'llama3.1:8b';
const BASE_URL = 'http://127.0.0.1:11434';
const REQUEST = 'light monsters that banish cards';
const QUERY_VECTOR = [1, 0, 0];

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

/** One vector per seeded card, so the first is the best match for a request. */
const SEED_VECTORS = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 0]
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

const statusEvents = (frames: Frame[]): TurnEvent[] =>
  frames
    .filter(frame => frame.event.type === TurnEventName.Status)
    .map(frame => frame.event);

describe('turn routes', () => {
  let dataDir: string;
  let store: IAppStore;

  const createDataDir = async (): Promise<string> => {
    dataDir = await mkdtemp(join(tmpdir(), 'ygo-assistant-turn-'));
    return dataDir;
  };

  const seedIndex = async (directory: string): Promise<void> => {
    let cursor = 0;
    const embedder: IOllamaClient = {
      listModels: async () => [],
      embed: async inputs => {
        const batch = SEED_VECTORS.slice(cursor, cursor + inputs.length);
        cursor += inputs.length;
        return batch;
      },
      chat: () => {
        throw new Error('Building the index never streams chat completions');
      }
    };

    await buildCardIndex({
      dataDir: directory,
      cards: CREATED_IDS,
      embedder,
      embeddingModel: EMBEDDING_MODEL,
      dimensions: DIMENSIONS,
      datasetVersion: 'ygoprodeck-2026-09-16'
    });
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
        prose
      ]
    });
  };

  const app = (client: IOllamaClient, logger: ILogger = silentLogger) =>
    createServer({
      config: loadConfig({
        DATA_DIR: dataDir,
        OLLAMA_CHAT_MODEL: CHAT_MODEL,
        OLLAMA_EMBEDDING_MODEL: EMBEDDING_MODEL,
        OLLAMA_EMBEDDING_DIMENSIONS: String(DIMENSIONS),
        RETRIEVAL_TOP_K: '10',
        RETRIEVAL_SHOWN: '1'
      }),
      logger,
      ollama: client,
      store
    });

  const postTurn = async (
    client: IOllamaClient,
    id: number,
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
    id: number,
    body: unknown = { text: REQUEST },
    logger: ILogger = silentLogger
  ): Promise<Frame[]> =>
    readFrames(await (await postTurn(client, id, body, logger)).text());

  const startConversation = (language = Language.English): Promise<number> =>
    store.conversations
      .create({ title: 'Toolbox', language, model: CHAT_MODEL })
      .then(conversation => conversation.id);

  beforeEach(async () => {
    await createDataDir();
    store = await openAppStore(databasePath(dataDir));
    await seedIndex(dataDir);
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
    expect(conversation.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'Blue-Eyes fits.',
      filters: LIGHT_FILTERS,
      cardIds: [CREATED_IDS[0]?.id]
    });
  });

  it('searches the free text the parse kept', async () => {
    const client = createClient(PARSE_ANSWER);

    await runTurn(client, await startConversation());

    expect(client.embeddedInputs).toEqual([['banish cards']]);
  });

  it('searches the request itself when the model names no constraint', async () => {
    const client = createClient(JSON.stringify({}));
    const conversationId = await startConversation();

    const frames = readFrames(
      await (await postTurn(client, conversationId)).text()
    );

    expect(client.embeddedInputs).toEqual([[REQUEST]]);
    expect(statusEvents(frames)).toEqual([
      { type: TurnEventName.Status, status: TurnStatus.FreeTextOnly }
    ]);
    expect(filtersEvents(frames)).toEqual([
      { type: TurnEventName.Filters, filters: [], query: REQUEST }
    ]);
    expect(shownCardNames(frames)).toEqual(['Blue-Eyes White Dragon']);
  });

  it('says the search runs on the player own words when the parse gives up', async () => {
    const client = createClient([
      'I would suggest Dark Magician.',
      'Still not JSON, sorry.'
    ]);
    const conversationId = await startConversation();

    const frames = await runTurn(client, conversationId);

    expect(eventNames(frames)).toEqual([
      TurnEventName.TurnStart,
      TurnEventName.Status,
      TurnEventName.Filters,
      TurnEventName.Cards,
      TurnEventName.AnswerDelta,
      TurnEventName.AnswerDelta,
      TurnEventName.AnswerEnd,
      TurnEventName.TurnEnd
    ]);
    expect(statusEvents(frames)).toEqual([
      { type: TurnEventName.Status, status: TurnStatus.FreeTextOnly }
    ]);
    expect(filtersEvents(frames)).toEqual([
      { type: TurnEventName.Filters, filters: [], query: REQUEST }
    ]);
    expect(client.embeddedInputs).toEqual([[REQUEST]]);
    expect(shownCardNames(frames)).toEqual(['Blue-Eyes White Dragon']);
    expect(answerText(frames)).toBe('Blue-Eyes fits.');
    // The two parse attempts, then the answer: a parse that degrades costs one
    // extra call and never the turn.
    expect(client.chatRequests).toHaveLength(3);
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
      cardIds: [CREATED_IDS[0]?.id]
    });
  });

  it('searches the language the conversation is in', async () => {
    const client = createClient(PARSE_ANSWER);

    const frames = await runTurn(
      client,
      await startConversation(Language.French)
    );

    expect(shownCardNames(frames)).toEqual(['Magicien Sombre']);
  });

  it('constrains the parse with the selected model and leaves the answer free', async () => {
    const client = createClient(PARSE_ANSWER);

    await runTurn(client, await startConversation());

    // The capability reaches the parse as a schema and never reaches the answer,
    // which is prose; this is what reading the model's capability buys.
    expect(client.chatRequests).toHaveLength(2);
    expect(client.chatRequests[0]?.model).toBe(CHAT_MODEL);
    expect(client.chatRequests[0]?.format).toBeDefined();
    expect(client.chatRequests[0]?.temperature).toBe(0);
    expect(client.chatRequests[1]?.format).toBeUndefined();
    expect(client.chatRequests[1]?.temperature).toBe(0);
    expect(client.chatRequests[1]?.messages[0]?.content).toContain(
      CREATED_IDS[0]?.name
    );
  });

  it('parses without a schema when the selected model is not installed', async () => {
    const client = createClient(PARSE_ANSWER, PROSE, []);

    await runTurn(client, await startConversation());

    expect(client.chatRequests[0]?.format).toBeUndefined();
  });

  it('answers without the model when the search found nothing', async () => {
    const client = createClient(
      JSON.stringify({
        filters: [
          {
            field: CardFilterField.Race,
            operator: FilterOperator.Eq,
            value: 'Toon'
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
      cardIds: []
    });
  });

  it('fails the turn when the model dies partway through the answer', async () => {
    const client = new FakeOllamaClient({
      models: [CHAT_MODEL_CAPABILITY],
      embeddings: [QUERY_VECTOR],
      chatResponses: [
        [{ content: PARSE_ANSWER, done: true }],
        [
          { content: 'Blue-Eyes ', done: false },
          { content: 'fits', done: false }
        ]
      ],
      chatFailures: [undefined, new OllamaUnreachableError(BASE_URL)]
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
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
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
      chatResponses: [[{ content: PARSE_ANSWER, done: true }], []]
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
    expect(records[0]).toMatchObject({
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
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      level: 'error',
      context: { conversationId, stage: TurnStage.Parse }
    });
    expect(records[0]?.context?.message).toContain('connection refused');

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
    expect(records[0]).toMatchObject({
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

    const response = await postTurn(client, 999);

    expect(response.status).toBe(404);
    expect(client.chatRequests).toEqual([]);
  });
});

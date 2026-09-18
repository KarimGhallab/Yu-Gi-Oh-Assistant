import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';

import {
  CardAttribute,
  type CardFilter,
  CardFilterField,
  FilterOperator,
  type TurnEvent,
  turnEventSchema
} from '@ygo-assistant/contracts';

import { createQueryClient } from '../shared/createQueryClient.js';

import App from '../App.js';

/**
 * Everything the app's suites share: the fixtures they are written against, the
 * doubles the app talks to, and the few ways a test drives the surface. It is
 * not a test file itself, so nothing here is collected or run on its own.
 */

/**
 * The id a test's n-th conversation or message stands for. An id is a UUID, and
 * a test that spelled one out in full would say nothing about what it names, so
 * they are built from the number the test already knows it by.
 */
export const uuid = (n: number): string =>
  `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

interface ConversationFixture {
  id: string;
  title: string | null;
  language: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

export const createConversation = (
  label: number,
  overrides: Partial<ConversationFixture> = {}
): ConversationFixture => ({
  id: uuid(label),
  title: `Conversation ${label}`,
  language: 'en',
  model: 'llama3.1:8b',
  createdAt: '2026-09-16T10:00:00.000Z',
  updatedAt: '2026-09-16T10:00:00.000Z',
  ...overrides
});

export const withMessages = (
  conversation: ConversationFixture,
  messages: unknown[] = []
): ConversationFixture & { messages: unknown[] } => ({
  ...conversation,
  messages
});

interface CardFixture {
  id: number;
  name: string;
  language: string;
  type: string;
  frameType: string;
  typeLine: string[];
  race: string;
  linkMarkers: string[];
  effect: string;
  imageUrl: string;
  sourceUrl: string;
}

export const createCard = (
  id: number,
  name: string,
  overrides: Partial<CardFixture> = {}
): CardFixture => ({
  id,
  name,
  language: 'en',
  type: 'Effect Monster',
  frameType: 'effect',
  typeLine: ['Effect Monster'],
  race: 'Dragon',
  linkMarkers: [],
  effect: 'When this card is summoned, it does something useful.',
  imageUrl: `https://images.example.test/cards/${id}.jpg`,
  sourceUrl: `https://example.test/cards/${id}`,
  ...overrides
});

export interface MessageFixture {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  search?: {
    filters: CardFilter[];
    query?: string;
    status?: string;
  };
  cards?: CardFixture[];
  createdAt: string;
}

export const said = (
  label: number,
  role: string,
  content: string,
  overrides: Partial<MessageFixture> = {}
): MessageFixture => ({
  id: uuid(label),
  conversationId: uuid(2),
  role,
  content,
  createdAt: '2026-09-16T10:00:00.000Z',
  ...overrides
});

export const playerMessage = (label: number, content: string): MessageFixture =>
  said(label, 'user', content);

export const assistantMessage = (
  label: number,
  content: string,
  cards?: CardFixture[]
): MessageFixture =>
  cards === undefined
    ? said(label, 'assistant', content)
    : said(label, 'assistant', content, { cards });

export const BLUE_EYES = createCard(89631139, 'Blue-Eyes White Dragon');
export const DARK_MAGICIAN = createCard(46986414, 'Dark Magician');
export const RED_EYES = createCard(10000, 'Red-Eyes Black Dragon');

export const LIGHT_ATTRIBUTE: CardFilter = {
  field: CardFilterField.Attribute,
  operator: FilterOperator.Eq,
  value: CardAttribute.Light
};

export const DARK_ATTRIBUTE: CardFilter = {
  field: CardFilterField.Attribute,
  operator: FilterOperator.Eq,
  value: CardAttribute.Dark
};

export const LEVEL_AT_LEAST_7: CardFilter = {
  field: CardFilterField.Level,
  operator: FilterOperator.Gte,
  value: 7
};

export const GRAVEYARD = createConversation(2, { title: 'Graveyard toolbox' });
export const UNTITLED = createConversation(1, { title: null });

export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });

export const notFound = (id: string): Response =>
  json({ error: `No conversation has id "${id}"` }, 404);

/**
 * Nothing focused, which is where a test of the tab order from the top starts.
 * Opening a conversation puts the keyboard in the request field, so a test that
 * means to walk the document from its start has to clear that first.
 */
export const clearFocus = (): void => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

type FetchHandler = (
  url: string,
  init: RequestInit | undefined
) => Response | Promise<Response>;

/**
 * The models a test's machine has installed unless it says otherwise: the one
 * the conversation fixtures are set to, so a test that is not about choosing a
 * model never has to think about the listing.
 */
const DEFAULT_MODELS = [
  {
    name: 'llama3.1:8b',
    supportsCompletion: true,
    supportsStructuredOutput: true
  }
];

/**
 * A fetch stub for the app. The model listing is answered here rather than in
 * every test, because its answer is the same for all of them except the ones
 * about choosing a model, which pass the listing they mean.
 */
export const stubFetch = (
  handler: FetchHandler,
  models: unknown[] = DEFAULT_MODELS
): ReturnType<typeof vi.fn> =>
  vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url === '/api/models') {
      return json(models);
    }

    return handler(url, init);
  });

export const requestedUrls = (fetchMock: ReturnType<typeof vi.fn>): string[] =>
  fetchMock.mock.calls.map(call => String(call[0]));

export interface TurnStream {
  response: Response;
  push(event: TurnEvent): void;
  pushText(text: string): void;
  close(): void;
}

/**
 * The turn a request answers with, under the test's own hand: the server writes
 * frames as it works, so the test writes them too, and can look at the screen
 * between them.
 */
export const turnStream = (): TurnStream => {
  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer = writable.getWriter();
  const write = (text: string): void => {
    void writer.write(new TextEncoder().encode(text));
  };

  return {
    response: new Response(readable, {
      headers: { 'content-type': 'text/event-stream' }
    }),
    push: event =>
      write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`),
    pushText: write,
    close: () => {
      void writer.close();
    }
  };
};

export const send = async (text: string): Promise<void> => {
  await userEvent.type(
    await screen.findByRole('textbox', { name: 'Your request' }),
    text
  );
  await userEvent.click(screen.getByRole('button', { name: 'Send' }));
};

/**
 * A setting of the request shows what it is set to and opens the rest of its
 * choices above itself, so its control is named by the setting and the value it
 * holds, and picking one is opening the control and choosing a row. A model's
 * row carries what it can do after its name, so a choice is named by the start
 * of it.
 */
export const settingControl = (label: string): Promise<HTMLElement> =>
  screen.findByRole('button', { name: new RegExp(`^${label}`) });

export const pickSetting = async (
  label: string,
  choice: string | RegExp
): Promise<void> => {
  await userEvent.click(await settingControl(label));
  await userEvent.click(screen.getByRole('option', { name: choice }));
};

/**
 * A frame the server would write. The frame is put through the contracts on its
 * way out, the way the server puts it through them on its way in, so a frame the
 * client could not read is a failing test rather than a silent one.
 */
export const arrives = async (
  stream: TurnStream,
  frame: unknown
): Promise<void> => {
  await act(async () => {
    stream.push(turnEventSchema.parse(frame));
  });
};

export const renderApp = (path: string): QueryClient => {
  // The client the app runs on, so what the tests see is what a player sees.
  const client = createQueryClient();

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]} useTransitions={false}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  );

  return client;
};

/**
 * A narrow window, as the frame asks about it. The browser is put back the way it
 * was afterwards, because every other test in this file is a desktop window.
 */
export const asNarrowWindow = (): (() => void) => {
  const wide = window.matchMedia;

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ ...wide(query), matches: false })
  });

  return () =>
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: wide
    });
};

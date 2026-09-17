import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CardAttribute,
  type CardFilter,
  CardFilterField,
  CardType,
  FilterOperator,
  type TurnEvent,
  TurnEventName,
  TurnStage,
  TurnStatus,
  turnEventSchema
} from '@ygo-assistant/contracts';

import { createQueryClient } from './shared/queryClient.js';

import App from './App.js';

interface ConversationFixture {
  id: number;
  title: string | null;
  language: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

const createConversation = (
  id: number,
  overrides: Partial<ConversationFixture> = {}
): ConversationFixture => ({
  id,
  title: `Conversation ${id}`,
  language: 'en',
  model: 'llama3.1:8b',
  createdAt: '2026-09-16T10:00:00.000Z',
  updatedAt: '2026-09-16T10:00:00.000Z',
  ...overrides
});

const withMessages = (
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

const createCard = (
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

interface MessageFixture {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  filters?: CardFilter[];
  cards?: CardFixture[];
  createdAt: string;
}

const said = (
  id: number,
  role: string,
  content: string,
  overrides: Partial<MessageFixture> = {}
): MessageFixture => ({
  id,
  conversationId: 2,
  role,
  content,
  createdAt: '2026-09-16T10:00:00.000Z',
  ...overrides
});

const playerMessage = (id: number, content: string): MessageFixture =>
  said(id, 'user', content);

const assistantMessage = (
  id: number,
  content: string,
  cards?: CardFixture[]
): MessageFixture =>
  cards === undefined
    ? said(id, 'assistant', content)
    : said(id, 'assistant', content, { cards });

const BLUE_EYES = createCard(89631139, 'Blue-Eyes White Dragon');
const DARK_MAGICIAN = createCard(46986414, 'Dark Magician');
const RED_EYES = createCard(10000, 'Red-Eyes Black Dragon');

const LIGHT_ATTRIBUTE: CardFilter = {
  field: CardFilterField.Attribute,
  operator: FilterOperator.Eq,
  value: CardAttribute.Light
};

const DARK_ATTRIBUTE: CardFilter = {
  field: CardFilterField.Attribute,
  operator: FilterOperator.Eq,
  value: CardAttribute.Dark
};

const LEVEL_AT_LEAST_7: CardFilter = {
  field: CardFilterField.Level,
  operator: FilterOperator.Gte,
  value: 7
};

const GRAVEYARD = createConversation(2, { title: 'Graveyard toolbox' });
const UNTITLED = createConversation(1, { title: null });

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });

const notFound = (id: number): Response =>
  json({ error: `No conversation has id ${id}` }, 404);

/**
 * Nothing focused, which is where a test of the tab order from the top starts.
 * Opening a conversation puts the keyboard in the request field, so a test that
 * means to walk the document from its start has to clear that first.
 */
const clearFocus = (): void => {
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
const stubFetch = (
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

const requestedUrls = (fetchMock: ReturnType<typeof vi.fn>): string[] =>
  fetchMock.mock.calls.map(call => String(call[0]));

interface TurnStream {
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
const turnStream = (): TurnStream => {
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

const send = async (text: string): Promise<void> => {
  await userEvent.type(
    await screen.findByRole('textbox', { name: 'Your request' }),
    text
  );
  await userEvent.click(screen.getByRole('button', { name: 'Send' }));
};

/**
 * A frame the server would write. The frame is put through the contracts on its
 * way out, the way the server puts it through them on its way in, so a frame the
 * client could not read is a failing test rather than a silent one.
 */
const arrives = async (stream: TurnStream, frame: unknown): Promise<void> => {
  await act(async () => {
    stream.push(turnEventSchema.parse(frame));
  });
};

const renderApp = (path: string): QueryClient => {
  // The client the app runs on, so what the tests see is what a player sees.
  const client = createQueryClient();

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  );

  return client;
};

describe('the chat', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists the conversations the server has, in the order it lists them', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD, UNTITLED])
          : notFound(999)
      )
    );

    renderApp('/');

    const conversations = await screen.findByRole('navigation', {
      name: 'Conversations'
    });
    expect(
      (await within(conversations).findAllByRole('link')).map(
        link => link.textContent
      )
    ).toEqual(['Graveyard toolbox', 'New conversation']);
  });

  it('marks the conversation the address names', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD, UNTITLED])
          : json(withMessages(GRAVEYARD))
      )
    );

    renderApp('/c/2');

    const conversations = await screen.findByRole('navigation', {
      name: 'Conversations'
    });
    const open = await within(conversations).findByRole('link', {
      current: 'page'
    });

    expect(open).toHaveTextContent('Graveyard toolbox');
  });

  it('starts a new conversation and opens it', async () => {
    const created = createConversation(7, { title: null });
    const fetchMock = stubFetch((url, init) => {
      if (init?.method === 'POST') {
        return json(created, 201);
      }
      if (url === '/api/conversations/7') {
        return json(withMessages(created));
      }
      return json([GRAVEYARD]);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/');

    await userEvent.click(
      await screen.findByRole('button', { name: 'New conversation' })
    );

    expect(
      await screen.findByRole('heading', { name: 'New conversation' })
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/conversations',
      expect.objectContaining({ method: 'POST' })
    );
    expect(requestedUrls(fetchMock)).toContain('/api/conversations/7');
  });

  it('opens the conversation the address names, on a first visit as on a reload', async () => {
    const fetchMock = stubFetch(url =>
      url === '/api/conversations'
        ? json([GRAVEYARD])
        : json(withMessages(GRAVEYARD, []))
    );
    vi.stubGlobal('fetch', fetchMock);

    // A reload is this: a fresh mount at the address the player is on.
    renderApp('/c/2');

    expect(
      await screen.findByRole('heading', { name: 'Graveyard toolbox' })
    ).toBeInTheDocument();
    expect(requestedUrls(fetchMock)).toContain('/api/conversations/2');
  });

  it('opens on the empty state without starting a conversation', async () => {
    const fetchMock = stubFetch(() => json([GRAVEYARD]));
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/');

    expect(
      await screen.findByRole('heading', { name: 'Start a conversation' })
    ).toBeInTheDocument();
    expect(fetchMock.mock.calls.every(call => call[1]?.method !== 'POST')).toBe(
      true
    );
  });

  it('says so when the address names no conversation, and offers a way back', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations' ? json([GRAVEYARD]) : notFound(999)
      )
    );

    renderApp('/c/999');

    expect(
      await screen.findByRole('heading', {
        name: 'That conversation does not exist'
      })
    ).toBeInTheDocument();
    expect(screen.getByText('No conversation has id 999')).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('link', { name: 'Back to the conversations' })
    );

    expect(
      await screen.findByRole('heading', { name: 'Start a conversation' })
    ).toBeInTheDocument();
  });

  it('shows the message the server gave when a request fails', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(() => json({ error: 'The card index is not ready' }, 503))
    );

    renderApp('/');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The card index is not ready'
    );
  });

  it('says so beside the control when a conversation cannot be started', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) =>
        init?.method === 'POST'
          ? json({ error: 'The index is being rebuilt' }, 503)
          : json([GRAVEYARD])
      )
    );

    renderApp('/');

    await userEvent.click(
      await screen.findByRole('button', { name: 'New conversation' })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The index is being rebuilt'
    );
    expect(
      screen.getByRole('heading', { name: 'Start a conversation' })
    ).toBeInTheDocument();
  });

  it('says what the server said when a conversation cannot be opened, and asks again on request', async () => {
    let attempted = false;
    const fetchMock = stubFetch(url => {
      if (url === '/api/conversations') {
        return json([GRAVEYARD]);
      }
      if (attempted) {
        return json(withMessages(GRAVEYARD));
      }
      attempted = true;
      return json({ error: 'The search is unavailable' }, 503);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/c/2');

    expect(
      await screen.findByRole('heading', {
        name: 'The conversation could not be opened'
      })
    ).toBeInTheDocument();
    expect(screen.getByText('The search is unavailable')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('heading', { name: 'Graveyard toolbox' })
    ).toBeInTheDocument();
  });

  it('treats a malformed conversation address as one that does not exist', async () => {
    const fetchMock = stubFetch(url =>
      url === '/api/conversations'
        ? json([GRAVEYARD])
        : json({ error: 'No conversation has id "abc"' }, 404)
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/c/abc');

    expect(
      await screen.findByRole('heading', {
        name: 'That conversation does not exist'
      })
    ).toBeInTheDocument();
    expect(requestedUrls(fetchMock)).toContain('/api/conversations/abc');
  });

  it('refuses an answer the contract does not describe', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(() => json([{ id: 'not-a-number', title: 'made up' }]))
    );

    renderApp('/');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The server answered with something this app does not understand.'
    );
    expect(screen.queryByText('made up')).not.toBeInTheDocument();
  });

  it('opens a conversation on what was said in it, in the order it was said', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(
              withMessages(GRAVEYARD, [
                playerMessage(11, 'Something to stop my opponent attacking'),
                assistantMessage(
                  12,
                  'Blue-Eyes White Dragon is the biggest body below.'
                ),
                playerMessage(13, 'Is it cheap?')
              ])
            )
      )
    );

    renderApp('/c/2');

    const history = await screen.findByRole('region', { name: 'Messages' });
    const turns = within(history).getAllByRole('listitem');

    expect(turns).toHaveLength(3);
    expect(within(turns[0]).getByText('You')).toBeInTheDocument();
    expect(
      within(turns[0]).getByText('Something to stop my opponent attacking')
    ).toBeInTheDocument();
    expect(within(turns[1]).getByText('Assistant')).toBeInTheDocument();
    expect(
      within(turns[1]).getByText(
        'Blue-Eyes White Dragon is the biggest body below.'
      )
    ).toBeInTheDocument();
    expect(within(turns[2]).getByText('You')).toBeInTheDocument();
    expect(within(turns[2]).getByText('Is it cheap?')).toBeInTheDocument();
  });

  it("shows an answer's cards in the order the server ranked them", async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(
              withMessages(GRAVEYARD, [
                playerMessage(11, 'I want a dragon'),
                assistantMessage(12, 'These are the ones to look at.', [
                  BLUE_EYES,
                  DARK_MAGICIAN,
                  RED_EYES
                ])
              ])
            )
      )
    );

    renderApp('/c/2');

    const history = await screen.findByRole('region', { name: 'Messages' });
    const answer = within(history).getAllByRole('listitem')[1];
    const cards = within(answer).getByRole('list', { name: 'Suggested cards' });

    expect(
      within(cards)
        .getAllByRole('listitem')
        .map(card => card.textContent)
    ).toEqual([
      'Blue-Eyes White Dragon',
      'Dark Magician',
      'Red-Eyes Black Dragon'
    ]);
    expect(
      Array.from(cards.querySelectorAll('img')).map(image =>
        image.getAttribute('src')
      )
    ).toEqual([BLUE_EYES.imageUrl, DARK_MAGICIAN.imageUrl, RED_EYES.imageUrl]);
    expect(
      within(cards).getByRole('link', { name: 'Blue-Eyes White Dragon' })
    ).toHaveAttribute('href', BLUE_EYES.sourceUrl);
  });

  it('keeps a card readable when its image cannot be loaded', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(
              withMessages(GRAVEYARD, [
                playerMessage(11, 'I want a dragon'),
                assistantMessage(12, 'This is the one to look at.', [BLUE_EYES])
              ])
            )
      )
    );

    renderApp('/c/2');

    const history = await screen.findByRole('region', { name: 'Messages' });
    const cards = within(history).getByRole('list', {
      name: 'Suggested cards'
    });

    for (const image of cards.querySelectorAll('img')) {
      fireEvent.error(image);
    }

    expect(cards.querySelector('img')).toBeNull();
    expect(within(cards).getByText('No image')).toBeInTheDocument();
    expect(
      within(cards).getByRole('link', { name: 'Blue-Eyes White Dragon' })
    ).toHaveAttribute('href', BLUE_EYES.sourceUrl);
  });

  it('says what can be asked in a conversation with nothing in it', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(withMessages(GRAVEYARD, []))
      )
    );

    renderApp('/c/2');

    expect(
      await screen.findByRole('heading', { name: 'Ask for cards' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Something to support a Red-Eyes deck')
    ).toBeInTheDocument();
    expect(
      screen.getByText('A cheap way to stop my opponent attacking')
    ).toBeInTheDocument();
  });

  it("reaches a card's source without a mouse", async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(
              withMessages(GRAVEYARD, [
                playerMessage(11, 'I want a dragon'),
                assistantMessage(12, 'These are the ones to look at.', [
                  BLUE_EYES,
                  DARK_MAGICIAN
                ])
              ])
            )
      )
    );

    renderApp('/c/2');
    await screen.findByRole('region', { name: 'Messages' });
    clearFocus();

    // The first stop is the way past the sidebar, and then the ways in are the
    // control that folds the list, the brand, the control that starts a
    // conversation, the conversation that is open and the two things that can be
    // done to it, so the cards the answer suggested come next.
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();

    expect(
      screen.getByRole('link', { name: 'Blue-Eyes White Dragon' })
    ).toHaveFocus();

    await userEvent.tab();

    expect(screen.getByRole('link', { name: 'Dark Magician' })).toHaveFocus();

    // The prompt comes after the conversation, because that is the order the
    // surface is read in, and it holds everything the request is run with: the
    // field, the language it is read in, the model that answers, and the Send.
    await userEvent.tab();

    expect(screen.getByRole('textbox', { name: 'Your request' })).toHaveFocus();

    await userEvent.tab();

    expect(screen.getByRole('combobox', { name: 'Cards in' })).toHaveFocus();

    await userEvent.tab();

    expect(screen.getByRole('combobox', { name: 'Answered by' })).toHaveFocus();

    // The Send is out of the tab order while there is nothing to send, so the
    // prompt's own controls are where the surface's stops end.
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('sends what the player typed and shows it before the server confirms it', async () => {
    const turn = turnStream();
    const fetchMock = stubFetch((url, init) =>
      init?.method === 'POST'
        ? turn.response
        : json(withMessages(GRAVEYARD, []))
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/c/2');
    await send('A cheap way to stop my opponent attacking');

    expect(
      screen.getByText('A cheap way to stop my opponent attacking')
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/conversations/2/messages',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          text: 'A cheap way to stop my opponent attacking',
          language: 'en',
          model: 'llama3.1:8b'
        })
      })
    );

    await arrives(turn, { type: TurnEventName.TurnStart, userMessageId: 11 });

    expect(
      screen.getAllByText('A cheap way to stop my opponent attacking')
    ).toHaveLength(1);

    await act(async () => {
      turn.close();
    });
  });

  it('sends on Enter and writes a line on Shift+Enter', async () => {
    const turn = turnStream();
    const fetchMock = stubFetch((url, init) =>
      init?.method === 'POST'
        ? turn.response
        : json(withMessages(GRAVEYARD, []))
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/c/2');
    const field = await screen.findByRole('textbox', { name: 'Your request' });

    await userEvent.type(field, 'a dark monster');
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');

    // Shift+Enter is a line rather than a request, so nothing has gone out and
    // the words, and the line, are still in the field.
    expect(fetchMock).not.toHaveBeenCalledWith(
      '/api/conversations/2/messages',
      expect.anything()
    );
    expect(field).toHaveValue('a dark monster\n');

    await userEvent.type(field, 'with no tribute');
    await userEvent.keyboard('{Enter}');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/conversations/2/messages',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          text: 'a dark monster\nwith no tribute',
          language: 'en',
          model: 'llama3.1:8b'
        })
      })
    );
    expect(field).toHaveValue('');

    await act(async () => {
      turn.close();
    });
  });

  it('shows the turn as the server reports it, with its cards and its answer in pieces', async () => {
    const turn = turnStream();
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) =>
        init?.method === 'POST'
          ? turn.response
          : json(withMessages(GRAVEYARD, []))
      )
    );

    renderApp('/c/2');
    await send('I want a dragon');

    const history = await screen.findByRole('region', { name: 'Messages' });

    await arrives(turn, { type: TurnEventName.TurnStart, userMessageId: 11 });
    expect(within(history).getByText('I want a dragon')).toBeInTheDocument();

    await arrives(turn, {
      type: TurnEventName.Status,
      status: TurnStatus.FreeTextOnly
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'No filters were understood'
    );

    await arrives(turn, {
      type: TurnEventName.Cards,
      cards: [BLUE_EYES, DARK_MAGICIAN]
    });
    const cards = within(history).getByRole('list', {
      name: 'Suggested cards'
    });
    expect(
      within(cards)
        .getAllByRole('listitem')
        .map(card => card.textContent)
    ).toEqual(['Blue-Eyes White Dragon', 'Dark Magician']);

    await arrives(turn, {
      type: TurnEventName.Filters,
      filters: [],
      query: 'I want a dragon'
    });

    // A search no filter was found for says so, in the words it ran on.
    expect(
      screen.getByText('Searched as written: I want a dragon')
    ).toBeInTheDocument();

    await arrives(turn, {
      type: TurnEventName.AnswerDelta,
      text: 'The biggest body '
    });
    expect(within(history).getByRole('log')).toHaveTextContent(
      'The biggest body'
    );

    await arrives(turn, {
      type: TurnEventName.AnswerDelta,
      text: 'is Blue-Eyes White Dragon.'
    });
    expect(within(history).getByRole('log')).toHaveTextContent(
      'The biggest body is Blue-Eyes White Dragon.'
    );

    await act(async () => {
      turn.close();
    });

    // What a turn said about how it searched outlives the turn: the reply the
    // server stores keeps the filters and not the reason a search had none.
    expect(
      screen.getByText('Searched as written: I want a dragon')
    ).toBeInTheDocument();
  });

  it('shows the filters a turn was searched with', async () => {
    const turn = turnStream();
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) =>
        init?.method === 'POST'
          ? turn.response
          : json(withMessages(GRAVEYARD, []))
      )
    );

    renderApp('/c/2');
    await send('light monsters of level 7 or more');

    await arrives(turn, { type: TurnEventName.TurnStart, userMessageId: 11 });
    await arrives(turn, {
      type: TurnEventName.Filters,
      filters: [LIGHT_ATTRIBUTE, LEVEL_AT_LEAST_7]
    });

    const readout = screen.getByRole('list', {
      name: 'What the search was understood as'
    });

    expect(
      within(readout)
        .getAllByRole('listitem')
        .map(fact => fact.textContent)
    ).toEqual(['attribute is LIGHT', 'level at least 7']);

    await act(async () => {
      turn.close();
    });
  });

  it('opens a conversation on the filters it was last searched with', async () => {
    const stored = [
      playerMessage(10, 'a dark monster'),
      said(11, 'assistant', 'Dark Magician fits.', {
        filters: [DARK_ATTRIBUTE],
        cards: [DARK_MAGICIAN]
      })
    ];
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(withMessages(GRAVEYARD, stored))
      )
    );

    renderApp('/c/2');

    const readout = await screen.findByRole('list', {
      name: 'What the search was understood as'
    });

    expect(
      within(readout)
        .getAllByRole('listitem')
        .map(fact => fact.textContent)
    ).toEqual(['attribute is DARK']);
  });

  it('says the last search of a conversation carried no filters', async () => {
    const stored = [
      playerMessage(10, 'something that stops attacks'),
      said(11, 'assistant', 'Searched by meaning.', { filters: [] })
    ];
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(withMessages(GRAVEYARD, stored))
      )
    );

    renderApp('/c/2');

    expect(await screen.findByText('No filters')).toBeInTheDocument();
  });

  it('re-runs the search on a corrected chip rather than reading the request', async () => {
    const turns: TurnStream[] = [];
    const stored = [
      playerMessage(10, 'a dark monster'),
      said(11, 'assistant', 'Dark Magician fits.', {
        filters: [DARK_ATTRIBUTE]
      })
    ];
    const fetchMock = stubFetch((url, init) => {
      if (init?.method === 'POST') {
        const turn = turnStream();
        turns.push(turn);
        return turn.response;
      }

      return json(withMessages(GRAVEYARD, stored));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/c/2');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Change attribute is DARK' })
    );
    await userEvent.selectOptions(screen.getByLabelText('Value'), 'LIGHT');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      screen.getByRole('button', { name: 'Change attribute is LIGHT' })
    ).toBeInTheDocument();

    await send('a dark monster');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/conversations/2/messages',
      expect.objectContaining({
        body: JSON.stringify({
          text: 'a dark monster',
          language: 'en',
          model: 'llama3.1:8b',
          filters: [{ field: 'attribute', operator: 'eq', value: 'LIGHT' }]
        })
      })
    );

    // The turn reports the set it is running with, and that report is what the
    // readout shows from then on.
    const corrected = turns[0];
    await arrives(corrected, {
      type: TurnEventName.TurnStart,
      userMessageId: 12
    });
    await arrives(corrected, {
      type: TurnEventName.Filters,
      filters: [LIGHT_ATTRIBUTE]
    });

    expect(
      screen.getByRole('button', { name: 'Change attribute is LIGHT' })
    ).toBeInTheDocument();

    // The correction has been used, so the next request goes back to being read
    // out of the words rather than searched with it again.
    await act(async () => {
      corrected.close();
    });
    await send('another request');

    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/conversations/2/messages',
      expect.objectContaining({
        body: JSON.stringify({
          text: 'another request',
          language: 'en',
          model: 'llama3.1:8b'
        })
      })
    );

    await act(async () => {
      turns[turns.length - 1]?.close();
    });
  });

  it('runs a search with no constraints when every chip is taken away', async () => {
    const turn = turnStream();
    const stored = [
      playerMessage(10, 'a dark monster'),
      said(11, 'assistant', 'Dark Magician fits.', {
        filters: [DARK_ATTRIBUTE]
      })
    ];
    const fetchMock = stubFetch((url, init) =>
      init?.method === 'POST'
        ? turn.response
        : json(withMessages(GRAVEYARD, stored))
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/c/2');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Change attribute is DARK' })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(await screen.findByText('No filters')).toBeInTheDocument();

    await send('a dark monster');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/conversations/2/messages',
      expect.objectContaining({
        body: JSON.stringify({
          text: 'a dark monster',
          language: 'en',
          model: 'llama3.1:8b',
          filters: []
        })
      })
    );

    await act(async () => {
      turn.close();
    });
  });

  it('parses a request sent without touching the chips on screen', async () => {
    const turn = turnStream();
    const stored = [
      playerMessage(10, 'a dark monster'),
      said(11, 'assistant', 'Dark Magician fits.', {
        filters: [DARK_ATTRIBUTE]
      })
    ];
    const fetchMock = stubFetch((url, init) =>
      init?.method === 'POST'
        ? turn.response
        : json(withMessages(GRAVEYARD, stored))
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/c/2');

    await screen.findByRole('button', { name: 'Change attribute is DARK' });
    await send('a light monster');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/conversations/2/messages',
      expect.objectContaining({
        body: JSON.stringify({
          text: 'a light monster',
          language: 'en',
          model: 'llama3.1:8b'
        })
      })
    );

    await act(async () => {
      turn.close();
    });
  });

  it('adds a filter the request never named, and searches with it beside the one it did', async () => {
    const turn = turnStream();
    const stored = [
      playerMessage(10, 'a dark monster'),
      said(11, 'assistant', 'Dark Magician fits.', {
        filters: [DARK_ATTRIBUTE]
      })
    ];
    const fetchMock = stubFetch((url, init) =>
      init?.method === 'POST'
        ? turn.response
        : json(withMessages(GRAVEYARD, stored))
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/c/2');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Add a filter' })
    );
    await userEvent.selectOptions(screen.getByLabelText('Field'), 'type');

    // A field with a fixed set of values comes with one of them, so the filter
    // is one the search accepts before the player touches anything but the field.
    expect(screen.getByLabelText('Operator')).toHaveValue(FilterOperator.Eq);
    expect(screen.getByLabelText('Value')).toHaveValue(CardType.NormalMonster);

    await userEvent.click(screen.getByRole('button', { name: 'Add' }));

    const readout = screen.getByRole('list', {
      name: 'What the search was understood as'
    });

    expect(
      within(readout)
        .getAllByRole('listitem')
        .map(fact => fact.textContent)
    ).toEqual(['attribute is DARK', 'type is Normal Monster']);

    await send('a dark monster');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/conversations/2/messages',
      expect.objectContaining({
        body: JSON.stringify({
          text: 'a dark monster',
          language: 'en',
          model: 'llama3.1:8b',
          filters: [
            { field: 'attribute', operator: 'eq', value: 'DARK' },
            { field: 'type', operator: 'eq', value: CardType.NormalMonster }
          ]
        })
      })
    );

    await act(async () => {
      turn.close();
    });
  });

  it('gathers the value and the operators the way the field being added takes them', async () => {
    const stored = [
      playerMessage(10, 'a dark monster'),
      said(11, 'assistant', 'Dark Magician fits.', { filters: [] })
    ];
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(withMessages(GRAVEYARD, stored))
      )
    );

    renderApp('/c/2');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Add a filter' })
    );

    // A new filter starts on a field that takes a number, which is a field the
    // player has to fill in before it can be added.
    expect(screen.getByLabelText('Value')).toHaveAttribute('type', 'number');
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();

    // An archetype is any words at all, and the operators are the ones text
    // takes rather than the ones a number takes.
    await userEvent.selectOptions(screen.getByLabelText('Field'), 'archetype');

    expect(screen.getByLabelText('Value')).toHaveAttribute('type', 'text');
    expect(
      within(screen.getByLabelText('Operator')).queryByRole('option', {
        name: 'above'
      })
    ).toBeNull();
    expect(
      within(screen.getByLabelText('Operator')).getByRole('option', {
        name: 'contains'
      })
    ).toBeInTheDocument();

    // A frame type is one of a fixed set, so the value is offered rather than
    // spelled, and it arrives with one of them.
    await userEvent.selectOptions(screen.getByLabelText('Field'), 'frameType');

    expect(screen.getByLabelText('Value').tagName).toBe('SELECT');
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
  });

  it('switches the language of a conversation and searches in it', async () => {
    const turn = turnStream();
    let language = 'en';
    const english = createCard(46986414, 'Dark Magician');
    const french = createCard(46986414, 'Magicien Sombre', { language: 'fr' });
    const fetchMock = stubFetch((url, init) => {
      if (url.endsWith('/messages')) {
        return turn.response;
      }
      if (init?.method === 'PATCH') {
        language = 'fr';
        return json(createConversation(2, { language }));
      }
      if (url === '/api/conversations') {
        return json([createConversation(2, { language })]);
      }

      return json(
        withMessages(createConversation(2, { language }), [
          playerMessage(10, 'a dark monster'),
          said(11, 'assistant', 'Here it is.', {
            filters: [],
            cards: [language === 'fr' ? french : english]
          })
        ])
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/c/2');

    expect(
      await screen.findByRole('link', { name: 'Dark Magician' })
    ).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Cards in'), 'fr');

    // The same turn comes back in the other language, and it is the same turn:
    // the cards were read again rather than the question answered twice.
    expect(
      await screen.findByRole('link', { name: 'Magicien Sombre' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Dark Magician' })).toBeNull();
    expect(screen.getAllByText('Assistant')).toHaveLength(1);

    // The turn that follows is searched in the language that is on screen.
    await send('a dark monster');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/conversations/2/messages',
      expect.objectContaining({
        body: JSON.stringify({
          text: 'a dark monster',
          language: 'fr',
          model: 'llama3.1:8b'
        })
      })
    );

    await act(async () => {
      turn.close();
    });
  });

  it('opens a conversation on the language it was left in', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([createConversation(2, { language: 'fr' })])
          : json(
              withMessages(createConversation(2, { language: 'fr' }), [
                playerMessage(10, 'un monstre sombre'),
                said(11, 'assistant', 'Le voici.', {
                  filters: [],
                  cards: [
                    createCard(46986414, 'Magicien Sombre', { language: 'fr' })
                  ]
                })
              ])
            )
      )
    );

    renderApp('/c/2');

    expect(await screen.findByLabelText('Cards in')).toHaveValue('fr');
    expect(
      await screen.findByRole('link', { name: 'Magicien Sombre' })
    ).toBeInTheDocument();
  });

  it('keeps the language and says what went wrong when the switch fails', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) => {
        if (init?.method === 'PATCH') {
          return json({ error: 'The conversation could not be changed' }, 503);
        }

        return url === '/api/conversations'
          ? json([createConversation(2)])
          : json(withMessages(createConversation(2)));
      })
    );

    renderApp('/c/2');

    await userEvent.selectOptions(
      await screen.findByLabelText('Cards in'),
      'fr'
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The conversation could not be changed'
    );
    expect(screen.getByLabelText('Cards in')).toHaveValue('en');
  });

  it("marks a card the conversation's language has no printing of", async () => {
    const french = createCard(46986414, 'Magicien Sombre', { language: 'fr' });
    const english = createCard(55144522, 'Pot of Greed');
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([createConversation(2, { language: 'fr' })])
          : json(
              withMessages(createConversation(2, { language: 'fr' }), [
                playerMessage(10, 'un monstre sombre'),
                said(11, 'assistant', 'Voici.', {
                  filters: [],
                  cards: [french, english]
                })
              ])
            )
      )
    );

    renderApp('/c/2');

    const cards = await screen.findByRole('list', { name: 'Suggested cards' });
    const [magicien, greed] = within(cards).getAllByRole('listitem');

    // The card the language has carries nothing, and is still announced by its
    // name alone: the marker of the other one is not part of any card's label.
    expect(within(magicien).queryByText('FR only')).toBeNull();
    expect(
      within(magicien).getByRole('link', { name: 'Magicien Sombre' })
    ).toBeInTheDocument();

    // The card only in English says which language it is in.
    expect(within(greed).getByText('EN only')).toBeInTheDocument();
    expect(
      within(greed).getByRole('link', { name: 'Pot of Greed' })
    ).toBeInTheDocument();
  });

  it('offers the installed models, saying which cannot produce structured filters', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(
        url =>
          url === '/api/conversations'
            ? json([GRAVEYARD])
            : json(withMessages(GRAVEYARD)),
        [
          {
            name: 'llama3.1:8b',
            supportsCompletion: true,
            supportsStructuredOutput: true
          },
          {
            name: 'mistral:7b',
            supportsCompletion: true,
            supportsStructuredOutput: false
          },
          {
            name: 'nomic-embed-text',
            supportsCompletion: false,
            supportsStructuredOutput: false
          }
        ]
      )
    );

    renderApp('/c/2');

    const chooser = await screen.findByLabelText('Answered by');

    expect(
      within(chooser)
        .getAllByRole('option')
        .map(option => option.textContent)
    ).toEqual([
      'llama3.1:8b',
      'mistral:7b (no structured filters)',
      'nomic-embed-text (cannot answer)'
    ]);
    expect(chooser).toHaveValue('llama3.1:8b');
  });

  it('runs the next turn on the model the player picked, and keeps it', async () => {
    const turn = turnStream();
    let model = 'llama3.1:8b';
    const fetchMock = stubFetch(
      (url, init) => {
        if (url.endsWith('/messages')) {
          return turn.response;
        }
        if (init?.method === 'PATCH') {
          model = 'mistral:7b';
          return json(createConversation(2, { model }));
        }
        if (url === '/api/conversations') {
          return json([createConversation(2, { model })]);
        }

        return json(withMessages(createConversation(2, { model })));
      },
      [
        {
          name: 'llama3.1:8b',
          supportsCompletion: true,
          supportsStructuredOutput: true
        },
        {
          name: 'mistral:7b',
          supportsCompletion: true,
          supportsStructuredOutput: false
        }
      ]
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/c/2');

    await userEvent.selectOptions(
      await screen.findByLabelText('Answered by'),
      'mistral:7b'
    );

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/conversations/2',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ model: 'mistral:7b' })
      })
    );

    await send('a dark monster');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/conversations/2/messages',
      expect.objectContaining({
        body: JSON.stringify({
          text: 'a dark monster',
          language: 'en',
          model: 'mistral:7b'
        })
      })
    );

    await act(async () => {
      turn.close();
    });
  });

  it('names a model that is not installed, and says what to do about it', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(
        url =>
          url === '/api/conversations'
            ? json([createConversation(2)])
            : json(withMessages(createConversation(2))),
        [
          {
            name: 'mistral:7b',
            supportsCompletion: true,
            supportsStructuredOutput: false
          }
        ]
      )
    );

    renderApp('/c/2');

    expect(await screen.findByLabelText('Answered by')).toHaveValue(
      'llama3.1:8b'
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Run ollama pull llama3.1:8b to install it.'
    );
  });

  it('replaces the turn it built with the one the server stored', async () => {
    const turn = turnStream();
    let title: string | null = null;
    let stored: MessageFixture[] = [];
    const fetchMock = stubFetch((url, init) => {
      if (init?.method === 'POST') {
        return turn.response;
      }

      const conversation = createConversation(2, { title });

      return url === '/api/conversations'
        ? json([conversation])
        : json(withMessages(conversation, stored));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/c/2');
    await send('I want a dragon');

    const history = await screen.findByRole('region', { name: 'Messages' });

    await arrives(turn, { type: TurnEventName.TurnStart, userMessageId: 11 });
    await arrives(turn, { type: TurnEventName.Cards, cards: [BLUE_EYES] });
    await arrives(turn, {
      type: TurnEventName.AnswerDelta,
      text: 'Blue-Eyes is the biggest body.'
    });

    // The turn is stored as it finishes, and the first message is what named the
    // conversation, so this is what the server holds when the client asks again.
    title = 'I want a dragon';
    stored = [
      playerMessage(11, 'I want a dragon'),
      assistantMessage(12, 'Blue-Eyes is the biggest body.', [BLUE_EYES])
    ];
    await arrives(turn, { type: TurnEventName.AnswerEnd });
    await arrives(turn, { type: TurnEventName.TurnEnd, messageId: 12 });

    expect(
      await screen.findByRole('heading', { name: 'I want a dragon' })
    ).toBeInTheDocument();
    expect(
      await within(history).findByText('Blue-Eyes is the biggest body.')
    ).toBeInTheDocument();
    expect(within(history).getAllByText('I want a dragon')).toHaveLength(1);
    expect(
      within(history).getAllByText('Blue-Eyes is the biggest body.')
    ).toHaveLength(1);
    expect(
      requestedUrls(fetchMock).filter(url => url === '/api/conversations/2')
    ).toHaveLength(2);
  });

  it('names the stage that failed and leaves no half-written answer', async () => {
    const turn = turnStream();
    let stored: MessageFixture[] = [];
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) => {
        if (init?.method === 'POST') {
          return turn.response;
        }

        const conversation = createConversation(2, { title: null });

        return url === '/api/conversations'
          ? json([conversation])
          : json(withMessages(conversation, stored));
      })
    );

    renderApp('/c/2');
    await send('I want a dragon');

    const history = await screen.findByRole('region', { name: 'Messages' });

    await arrives(turn, { type: TurnEventName.TurnStart, userMessageId: 11 });
    await arrives(turn, {
      type: TurnEventName.AnswerDelta,
      text: 'Blue-Eyes is '
    });
    expect(within(history).getByText(/Blue-Eyes is/)).toBeInTheDocument();

    // The turn gives way at the answer stage: the question was stored, the prose
    // was not, and the server hands back its account of what happened.
    stored = [playerMessage(11, 'I want a dragon')];
    await arrives(turn, {
      type: TurnEventName.Error,
      stage: TurnStage.Answer,
      message: 'The model stopped answering'
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The answer could not be written: The model stopped answering'
    );
    expect(within(history).queryByText(/Blue-Eyes is/)).not.toBeInTheDocument();
    expect(within(history).getAllByText('I want a dragon')).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'Your request' })).toBeEnabled();
  });

  it("surfaces the server's own message when a turn is refused before it starts", async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) => {
        if (init?.method === 'POST') {
          return json({ error: 'The model qwen3:4b is not installed' }, 503);
        }

        return url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(withMessages(GRAVEYARD, []));
      })
    );

    renderApp('/c/2');
    await send('I want a dragon');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The model qwen3:4b is not installed'
    );
    expect(screen.getByText('I want a dragon')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Your request' })).toBeEnabled();
  });

  it('takes one request at a time and says so while the turn runs', async () => {
    const turn = turnStream();
    const fetchMock = stubFetch((url, init) =>
      init?.method === 'POST'
        ? turn.response
        : json(withMessages(GRAVEYARD, []))
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/c/2');
    await send('I want a dragon');

    expect(screen.getByRole('status')).toHaveTextContent(
      'The assistant is working'
    );
    expect(screen.getByRole('textbox', { name: 'Your request' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(
      fetchMock.mock.calls.filter(call => call[1]?.method === 'POST')
    ).toHaveLength(1);

    await act(async () => {
      turn.close();
    });
  });

  it('shows the answer and no grid when the search found no cards', async () => {
    const turn = turnStream();
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) =>
        init?.method === 'POST'
          ? turn.response
          : json(withMessages(GRAVEYARD, []))
      )
    );

    renderApp('/c/2');
    await send('What about something that comes back from the graveyard?');

    const history = await screen.findByRole('region', { name: 'Messages' });

    await arrives(turn, { type: TurnEventName.TurnStart, userMessageId: 11 });
    await arrives(turn, { type: TurnEventName.Cards, cards: [] });
    await arrives(turn, {
      type: TurnEventName.AnswerDelta,
      text: 'I could not find a card that matches that request.'
    });

    expect(
      within(history).getByText(/could not find a card/)
    ).toBeInTheDocument();
    expect(
      within(history).queryByRole('list', { name: 'Suggested cards' })
    ).not.toBeInTheDocument();

    await act(async () => {
      turn.close();
    });
  });

  it('announces the answer as it is written, a piece at a time', async () => {
    const turn = turnStream();
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) =>
        init?.method === 'POST'
          ? turn.response
          : json(withMessages(GRAVEYARD, []))
      )
    );

    renderApp('/c/2');
    await send('I want a dragon');

    const history = await screen.findByRole('region', { name: 'Messages' });

    await arrives(turn, { type: TurnEventName.TurnStart, userMessageId: 11 });
    await arrives(turn, {
      type: TurnEventName.AnswerDelta,
      text: 'Blue-Eyes '
    });
    await arrives(turn, {
      type: TurnEventName.AnswerDelta,
      text: 'is the biggest body.'
    });

    // What is announced is each piece as it arrives, rather than the answer
    // growing and being read out again from the beginning every time.
    const announced = within(history).getByRole('log');

    expect(
      Array.from(announced.querySelectorAll('span')).map(
        piece => piece.textContent
      )
    ).toEqual(['Blue-Eyes ', 'is the biggest body.']);

    await act(async () => {
      turn.close();
    });
  });

  it('asks from an example prompt in a conversation with nothing in it', async () => {
    const turn = turnStream();
    const fetchMock = stubFetch((url, init) => {
      if (init?.method === 'POST') {
        return turn.response;
      }

      return url === '/api/conversations'
        ? json([GRAVEYARD])
        : json(withMessages(GRAVEYARD, []));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/c/2');

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Something to support a Red-Eyes deck'
      })
    );

    expect(
      screen.getAllByText('Something to support a Red-Eyes deck')
    ).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/conversations/2/messages',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          text: 'Something to support a Red-Eyes deck',
          language: 'en',
          model: 'llama3.1:8b'
        })
      })
    );

    await act(async () => {
      turn.close();
    });
  });

  it('reads a frame the server split across pieces', async () => {
    const turn = turnStream();
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) =>
        init?.method === 'POST'
          ? turn.response
          : json(withMessages(GRAVEYARD, []))
      )
    );

    renderApp('/c/2');
    await send('I want a dragon');

    const history = await screen.findByRole('region', { name: 'Messages' });
    const frame = `event: cards\ndata: ${JSON.stringify({
      type: TurnEventName.Cards,
      cards: [BLUE_EYES]
    })}\n\n`;

    await act(async () => {
      turn.pushText(frame.slice(0, 20));
    });

    expect(
      within(history).queryByRole('list', { name: 'Suggested cards' })
    ).not.toBeInTheDocument();

    await act(async () => {
      turn.pushText(frame.slice(20));
    });

    expect(
      await within(history).findByRole('list', { name: 'Suggested cards' })
    ).toBeInTheDocument();

    await act(async () => {
      turn.close();
    });
  });

  it('refuses a frame the contracts do not describe', async () => {
    const turn = turnStream();
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) => {
        if (init?.method === 'POST') {
          return turn.response;
        }

        return url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(withMessages(GRAVEYARD, []));
      })
    );

    renderApp('/c/2');
    await send('I want a dragon');

    await arrives(turn, { type: TurnEventName.TurnStart, userMessageId: 11 });

    await act(async () => {
      turn.pushText(
        'event: cards\ndata: {"type":"cards","cards":[{"id":"nope"}]}\n\n'
      );
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The server answered with something this app does not understand.'
    );
  });

  it('does not show the question twice when the conversation is read mid-turn', async () => {
    const turn = turnStream();
    let stored: MessageFixture[] = [];
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) => {
        if (init?.method === 'POST') {
          return turn.response;
        }

        return url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(withMessages(GRAVEYARD, stored));
      })
    );

    const client = renderApp('/c/2');
    await send('I want a dragon');

    const history = await screen.findByRole('region', { name: 'Messages' });

    await arrives(turn, { type: TurnEventName.TurnStart, userMessageId: 11 });
    expect(within(history).getAllByText('I want a dragon')).toHaveLength(1);

    // The server stores the question before the turn runs, so a read of the
    // conversation while it is still running carries the same question back.
    stored = [playerMessage(11, 'I want a dragon')];
    await act(async () => {
      await client.refetchQueries();
    });

    expect(within(history).getAllByText('I want a dragon')).toHaveLength(1);

    await act(async () => {
      turn.close();
    });
  });

  it('stops the turn when the player opens another conversation', async () => {
    const turn = turnStream();
    let signalled: AbortSignal | null | undefined;
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) => {
        if (init?.method === 'POST') {
          signalled = init.signal;
          return turn.response;
        }

        return url === '/api/conversations'
          ? json([GRAVEYARD, UNTITLED])
          : json(withMessages(GRAVEYARD, []));
      })
    );

    renderApp('/c/2');
    await send('I want a dragon');
    await screen.findByRole('region', { name: 'Messages' });

    await userEvent.click(
      await screen.findByRole('link', { name: 'New conversation' })
    );

    expect(
      await screen.findByRole('heading', { name: 'Graveyard toolbox' })
    ).toBeInTheDocument();
    expect(signalled?.aborted).toBe(true);
  });

  it('marks a row action instead of wording it, and keeps it named', async () => {
    const conversation = createConversation(2, { title: 'Graveyard toolbox' });
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([conversation])
          : json(withMessages(conversation))
      )
    );

    renderApp('/c/2');

    const rename = await screen.findByRole('button', {
      name: 'Rename Graveyard toolbox'
    });
    const remove = screen.getByRole('button', {
      name: 'Delete Graveyard toolbox'
    });

    expect(rename.textContent).toBe('');
    expect(remove.textContent).toBe('');
    expect(rename.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(remove.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the word on the controls that carry one', async () => {
    const conversation = createConversation(2, { title: 'Graveyard toolbox' });
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([conversation])
          : json(withMessages(conversation))
      )
    );

    renderApp('/c/2');

    const start = await screen.findByRole('button', {
      name: 'New conversation'
    });
    const send = await screen.findByRole('button', { name: 'Send' });

    expect(start).toHaveTextContent('New');
    expect(send).toHaveTextContent('Send');
    expect(start.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(send.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('puts the keyboard in the prompt when a conversation is opened', async () => {
    const banish = createConversation(3, { title: 'Banish toolbox' });
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD, banish])
          : json(withMessages(url.includes('/3') ? banish : GRAVEYARD))
      )
    );

    renderApp('/c/2');

    await userEvent.click(
      await screen.findByRole('link', { name: 'Banish toolbox' })
    );

    const field = await screen.findByRole('textbox', { name: 'Your request' });
    await waitFor(() => expect(field).toHaveFocus());
  });

  it('folds the conversations away, and keeps them as named marks', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(withMessages(GRAVEYARD))
      )
    );

    renderApp('/c/2');
    await screen.findByRole('region', { name: 'Messages' });

    const fold = screen.getByRole('button', {
      name: 'Hide the conversations'
    });
    expect(fold).toHaveAttribute('aria-expanded', 'true');
    expect(
      screen.getByRole('button', { name: 'Rename Graveyard toolbox' })
    ).toBeInTheDocument();

    await userEvent.click(fold);

    expect(
      screen.getByRole('button', { name: 'Show the conversations' })
    ).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('button', { name: 'Rename Graveyard toolbox' })
    ).not.toBeInTheDocument();

    const mark = screen.getByRole('link', { name: 'Graveyard toolbox' });
    expect(mark).toHaveTextContent('G');
  });

  it('names a folded conversation when its mark is pointed at', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(withMessages(GRAVEYARD))
      )
    );

    renderApp('/c/2');
    await screen.findByRole('region', { name: 'Messages' });

    await userEvent.click(
      screen.getByRole('button', { name: 'Hide the conversations' })
    );

    const mark = screen.getByRole('link', { name: 'Graveyard toolbox' });
    await userEvent.hover(mark);

    // The page's own heading carries the same words, so the sidebar is where the
    // name is looked for.
    const sidebar = within(screen.getByRole('complementary'));
    expect(sidebar.getByText('Graveyard toolbox')).toBeInTheDocument();

    await userEvent.unhover(mark);

    expect(sidebar.queryByText('Graveyard toolbox')).not.toBeInTheDocument();
  });

  it('does nothing when the rail itself is pointed at', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(withMessages(GRAVEYARD))
      )
    );

    renderApp('/c/2');
    await screen.findByRole('region', { name: 'Messages' });

    await userEvent.click(
      screen.getByRole('button', { name: 'Hide the conversations' })
    );
    await userEvent.hover(
      screen.getByRole('navigation', { name: 'Conversations' })
    );

    const sidebar = within(screen.getByRole('complementary'));
    expect(sidebar.queryByText('Graveyard toolbox')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Rename Graveyard toolbox' })
    ).not.toBeInTheDocument();
  });

  it('renames a conversation from the sidebar', async () => {
    let title: string | null = 'Graveyard toolbox';
    const fetchMock = stubFetch((url, init) => {
      if (init?.method === 'PATCH') {
        title = (JSON.parse(String(init.body)) as { title: string }).title;
        return json(createConversation(2, { title }));
      }

      const conversation = createConversation(2, { title });

      return url === '/api/conversations'
        ? json([conversation])
        : json(withMessages(conversation));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/c/2');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Rename Graveyard toolbox' })
    );

    const field = screen.getByRole('textbox', { name: 'Conversation name' });
    expect(field).toHaveValue('Graveyard toolbox');

    await userEvent.clear(field);
    await userEvent.type(field, 'Banish toolbox');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByRole('heading', { name: 'Banish toolbox' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Banish toolbox' })
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/conversations/2',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ title: 'Banish toolbox' })
      })
    );
  });

  it('keeps the old name and says what went wrong when a rename fails', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) => {
        if (init?.method === 'PATCH') {
          return json({ error: 'That name is not allowed' }, 400);
        }

        const conversation = createConversation(2, {
          title: 'Graveyard toolbox'
        });

        return url === '/api/conversations'
          ? json([conversation])
          : json(withMessages(conversation));
      })
    );

    renderApp('/c/2');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Rename Graveyard toolbox' })
    );

    const field = screen.getByRole('textbox', { name: 'Conversation name' });
    await userEvent.clear(field);
    await userEvent.type(field, 'Nope');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That name is not allowed'
    );
    expect(
      screen.getByRole('link', { name: 'Graveyard toolbox' })
    ).toBeInTheDocument();
  });

  it('asks before deleting a conversation, and removes it when told to', async () => {
    let listed = [GRAVEYARD, UNTITLED];
    const fetchMock = stubFetch((url, init) => {
      if (init?.method === 'DELETE') {
        listed = listed.filter(conversation => conversation.id !== 1);
        return new Response(null, { status: 204 });
      }

      return url === '/api/conversations'
        ? json(listed)
        : json(withMessages(GRAVEYARD));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/c/2');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete New conversation' })
    );

    // Nothing is deleted until the deletion has been confirmed, and the
    // confirmation is what the deletion is named for.
    expect(screen.getByText('Delete this conversation?')).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(call => call[1]?.method === 'DELETE')
    ).toBe(false);

    await userEvent.click(
      screen.getByRole('button', { name: 'Delete New conversation' })
    );

    await waitFor(() => {
      expect(
        screen.queryByRole('link', { name: 'New conversation' })
      ).not.toBeInTheDocument();
    });

    // The player was reading one conversation and deleted another, so they are
    // left where they were, on the conversation that took its place.
    expect(
      screen.getByRole('heading', { name: 'Graveyard toolbox' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Graveyard toolbox' })
    ).toHaveFocus();
  });

  it('leaves the conversation alone and says what went wrong when a delete fails', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) =>
        init?.method === 'DELETE'
          ? json({ error: 'The conversation is in use' }, 409)
          : url === '/api/conversations'
            ? json([GRAVEYARD])
            : json(withMessages(GRAVEYARD))
      )
    );

    renderApp('/c/2');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete Graveyard toolbox' })
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete Graveyard toolbox' })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The conversation is in use'
    );
    expect(
      screen.getByRole('link', { name: 'Graveyard toolbox' })
    ).toHaveFocus();
  });

  it('renames from the keyboard', async () => {
    let title: string | null = 'Graveyard toolbox';
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) => {
        if (init?.method === 'PATCH') {
          title = (JSON.parse(String(init.body)) as { title: string }).title;
          return json(createConversation(2, { title }));
        }

        const conversation = createConversation(2, { title });

        return url === '/api/conversations'
          ? json([conversation])
          : json(withMessages(conversation));
      })
    );

    renderApp('/c/2');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Rename Graveyard toolbox' })
    );

    const field = screen.getByRole('textbox', { name: 'Conversation name' });
    expect(field).toHaveFocus();

    await userEvent.clear(field);
    await userEvent.type(field, 'Banish toolbox{Enter}');

    expect(
      await screen.findByRole('heading', { name: 'Banish toolbox' })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'Banish toolbox' })
      ).toHaveFocus();
    });
  });

  it('leaves a rename alone when it is called off', async () => {
    const fetchMock = stubFetch(url =>
      url === '/api/conversations'
        ? json([GRAVEYARD])
        : json(withMessages(GRAVEYARD))
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/c/2');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Rename Graveyard toolbox' })
    );
    await userEvent.keyboard('{Escape}');

    expect(
      screen.getByRole('link', { name: 'Graveyard toolbox' })
    ).toHaveFocus();
    expect(fetchMock.mock.calls.some(call => call[1]?.method === 'PATCH')).toBe(
      false
    );
  });

  it('leaves a conversation alone when the deletion is called off', async () => {
    const fetchMock = stubFetch((url, init) =>
      init?.method === 'DELETE'
        ? new Response(null, { status: 204 })
        : url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(withMessages(GRAVEYARD))
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/c/2');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete Graveyard toolbox' })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(
      screen.getByRole('link', { name: 'Graveyard toolbox' })
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(call => call[1]?.method === 'DELETE')
    ).toBe(false);
  });

  it('moves off the conversation that is deleted', async () => {
    let listed = [GRAVEYARD];
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) => {
        if (init?.method === 'DELETE') {
          listed = [];
          return new Response(null, { status: 204 });
        }

        return url === '/api/conversations'
          ? json(listed)
          : json(withMessages(GRAVEYARD));
      })
    );

    renderApp('/c/2');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete Graveyard toolbox' })
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete Graveyard toolbox' })
    );

    expect(
      await screen.findByRole('heading', { name: 'Start a conversation' })
    ).toBeInTheDocument();
  });

  it("reaches a conversation's actions without a mouse", async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(withMessages(GRAVEYARD))
      )
    );

    renderApp('/c/2');
    await screen.findByRole('link', { name: 'Graveyard toolbox' });
    clearFocus();

    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();

    expect(
      screen.getByRole('button', { name: 'Rename Graveyard toolbox' })
    ).toHaveFocus();

    await userEvent.tab();

    expect(
      screen.getByRole('button', { name: 'Delete Graveyard toolbox' })
    ).toHaveFocus();

    await userEvent.keyboard('{Enter}');

    expect(screen.getByText('Delete this conversation?')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Delete Graveyard toolbox' })
    ).toHaveFocus();
  });

  it('reaches the request without passing every conversation', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(withMessages(GRAVEYARD))
      )
    );

    renderApp('/c/2');
    await screen.findByRole('textbox', { name: 'Your request' });
    clearFocus();

    await userEvent.tab();

    const skip = screen.getByRole('link', {
      name: 'Skip to the conversation'
    });
    expect(skip).toHaveFocus();

    await userEvent.keyboard('{Enter}');

    expect(screen.getByRole('textbox', { name: 'Your request' })).toHaveFocus();
  });

  it('leaves the keyboard where the next request will be typed', async () => {
    const turn = turnStream();
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) =>
        init?.method === 'POST'
          ? turn.response
          : url === '/api/conversations'
            ? json([GRAVEYARD])
            : json(withMessages(GRAVEYARD))
      )
    );

    renderApp('/c/2');
    await send('I want a dragon');

    const field = screen.getByRole('textbox', { name: 'Your request' });
    expect(field).toHaveFocus();

    // A player can write the next request while this one is still answering.
    await userEvent.type(field, 'and a trap card');
    expect(field).toHaveValue('and a trap card');

    await act(async () => {
      turn.close();
    });
  });

  it('leaves the keyboard on the row it renamed', async () => {
    let title: string | null = 'Graveyard toolbox';
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) => {
        if (init?.method === 'PATCH') {
          title = (JSON.parse(String(init.body)) as { title: string }).title;
          return json(createConversation(2, { title }));
        }

        const conversation = createConversation(2, { title });

        return url === '/api/conversations'
          ? json([conversation])
          : json(withMessages(conversation));
      })
    );

    renderApp('/c/2');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Rename Graveyard toolbox' })
    );

    const name = screen.getByRole('textbox', { name: 'Conversation name' });
    await userEvent.clear(name);
    await userEvent.type(name, 'Banish toolbox');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'Banish toolbox' })
      ).toHaveFocus();
    });
  });

  it('reaches the conversations without a mouse', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations' ? json([GRAVEYARD]) : notFound(999)
      )
    );

    renderApp('/');
    await screen.findByRole('link', { name: 'Graveyard toolbox' });

    await userEvent.tab();
    expect(
      screen.getByRole('button', { name: 'Hide the conversations' })
    ).toHaveFocus();

    await userEvent.tab();
    expect(
      screen.getByRole('link', { name: 'Yu-Gi-Oh Assistant' })
    ).toHaveFocus();

    await userEvent.tab();
    expect(
      screen.getByRole('button', { name: 'New conversation' })
    ).toHaveFocus();

    await userEvent.tab();
    expect(
      screen.getByRole('link', { name: 'Graveyard toolbox' })
    ).toHaveFocus();
  });
});

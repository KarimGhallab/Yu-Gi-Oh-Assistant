import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from './App.js';
import { createQueryClient } from './queryClient.js';

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

const GRAVEYARD = createConversation(2, { title: 'Graveyard toolbox' });
const UNTITLED = createConversation(1, { title: null });

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });

const notFound = (id: number): Response =>
  json({ error: `No conversation has id ${id}` }, 404);

type FetchHandler = (
  url: string,
  init: RequestInit | undefined
) => Response | Promise<Response>;

const stubFetch = (handler: FetchHandler): ReturnType<typeof vi.fn> =>
  vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init)
  );

const requestedUrls = (fetchMock: ReturnType<typeof vi.fn>): string[] =>
  fetchMock.mock.calls.map(call => String(call[0]));

const renderApp = (path: string): void => {
  // The client the app runs on, so what the tests see is what a player sees.
  const client = createQueryClient();

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  );
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

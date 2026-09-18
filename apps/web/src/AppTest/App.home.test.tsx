import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  GRAVEYARD,
  createConversation,
  json,
  notFound,
  renderApp,
  requestedUrls,
  settingControl,
  stubFetch,
  turnStream,
  uuid,
  withMessages
} from './appTestHarness.js';

describe('the home surface', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('opens the conversation the address names, on a first visit as on a reload', async () => {
    const fetchMock = stubFetch(url =>
      url === '/api/conversations'
        ? json([GRAVEYARD])
        : json(withMessages(GRAVEYARD, []))
    );
    vi.stubGlobal('fetch', fetchMock);

    // A reload is this: a fresh mount at the address the player is on.
    renderApp(`/c/${uuid(2)}`);

    expect(
      await screen.findByRole('heading', { name: 'Graveyard toolbox' })
    ).toBeInTheDocument();
    expect(requestedUrls(fetchMock)).toContain(`/api/conversations/${uuid(2)}`);
  });

  it('opens on the empty state with the prompt, without starting a conversation', async () => {
    const fetchMock = stubFetch(() => json([GRAVEYARD]));
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/');

    expect(
      await screen.findByRole('heading', { name: 'Start a conversation' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Describe the cards you are looking for.')
    ).toBeInTheDocument();

    // The request can be typed here, so the keyboard is already in it, and the
    // settings it will be run with are on it, on the first model the machine can
    // answer with.
    const field = screen.getByRole('textbox', { name: 'Your request' });
    expect(field).toHaveFocus();
    expect(await settingControl('Cards in')).toHaveTextContent('English');
    expect(await settingControl('Answered by')).toHaveTextContent(
      'llama3.1:8b'
    );

    expect(fetchMock.mock.calls.every(call => call[1]?.method !== 'POST')).toBe(
      true
    );
  });

  it('starts a conversation from the request typed on the empty state', async () => {
    const created = createConversation(9, { title: null });
    const turn = turnStream();
    const fetchMock = stubFetch((url, init) => {
      if (url === '/api/conversations' && init?.method === 'POST') {
        return json(created, 201);
      }

      if (url === `/api/conversations/${uuid(9)}/messages`) {
        return turn.response;
      }

      return json(withMessages(created));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/');

    const field = await screen.findByRole('textbox', { name: 'Your request' });
    await userEvent.type(field, 'a dark monster{Enter}');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/conversations',
      expect.objectContaining({ method: 'POST' })
    );

    expect(
      await screen.findByRole('heading', { name: 'New conversation' })
    ).toBeInTheDocument();

    // The request is asked in the conversation it started, with the settings the
    // conversation was created with rather than any this surface never had.
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/conversations/${uuid(9)}/messages`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ text: 'a dark monster' })
      })
    );
    expect(await screen.findByText('a dark monster')).toBeInTheDocument();

    await act(async () => {
      turn.close();
    });
  });

  it('starts a conversation from a request offered on the empty state', async () => {
    const created = createConversation(11, { title: null });
    const turn = turnStream();
    const fetchMock = stubFetch((url, init) => {
      if (url === '/api/conversations' && init?.method === 'POST') {
        return json(created, 201);
      }

      if (url === `/api/conversations/${uuid(11)}/messages`) {
        return turn.response;
      }

      return json(withMessages(created));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/');

    // The requests a player can ask for are on the home surface too, and choosing
    // one starts the conversation with it, exactly as typing it would. Which four
    // are offered is drawn, so the test asks for the one it was shown.
    const offered = within(
      await screen.findByRole('list', { name: 'What can be asked' })
    ).getAllByRole('listitem')[0].textContent;
    await userEvent.click(
      within(screen.getByRole('list', { name: 'What can be asked' })).getByRole(
        'button',
        { name: offered }
      )
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/conversations/${uuid(11)}/messages`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ text: offered })
      })
    );
    expect(await screen.findByText(offered)).toBeInTheDocument();

    await act(async () => {
      turn.close();
    });
  });

  it('keeps the words when a conversation cannot be started', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch((url, init) =>
        init?.method === 'POST'
          ? json({ error: 'Ollama is unreachable' }, 503)
          : json([GRAVEYARD])
      )
    );

    renderApp('/');

    const field = await screen.findByRole('textbox', { name: 'Your request' });
    await userEvent.type(field, 'a dark monster{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ollama is unreachable'
    );
    expect(field).toHaveValue('a dark monster');
  });

  it('says so when the address names no conversation, and offers a way back', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations' ? json([GRAVEYARD]) : notFound(uuid(999))
      )
    );

    renderApp(`/c/${uuid(999)}`);

    expect(
      await screen.findByRole('heading', {
        name: 'That conversation does not exist'
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(`No conversation has id "${uuid(999)}"`)
    ).toBeInTheDocument();

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

    renderApp(`/c/${uuid(2)}`);

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
});

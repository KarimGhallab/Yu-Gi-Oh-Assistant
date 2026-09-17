import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TurnEventName, TurnStage, TurnStatus } from '@ygo-assistant/contracts';

import {
  BLUE_EYES,
  DARK_MAGICIAN,
  GRAVEYARD,
  type MessageFixture,
  UNTITLED,
  arrives,
  assistantMessage,
  createConversation,
  json,
  playerMessage,
  renderApp,
  requestedUrls,
  send,
  stubFetch,
  turnStream,
  uuid,
  withMessages
} from './appTestHarness.js';

describe('running a turn', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends what the player typed and shows it before the server confirms it', async () => {
    const turn = turnStream();
    const fetchMock = stubFetch((url, init) =>
      init?.method === 'POST'
        ? turn.response
        : json(withMessages(GRAVEYARD, []))
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp(`/c/${uuid(2)}`);
    await send('A cheap way to stop my opponent attacking');

    expect(
      screen.getByText('A cheap way to stop my opponent attacking')
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/conversations/${uuid(2)}/messages`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          text: 'A cheap way to stop my opponent attacking',
          language: 'en',
          model: 'llama3.1:8b'
        })
      })
    );

    await arrives(turn, {
      type: TurnEventName.TurnStart,
      userMessageId: uuid(11)
    });

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

    renderApp(`/c/${uuid(2)}`);
    const field = await screen.findByRole('textbox', { name: 'Your request' });

    await userEvent.type(field, 'a dark monster');
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');

    // Shift+Enter is a line rather than a request, so nothing has gone out and
    // the words, and the line, are still in the field.
    expect(fetchMock).not.toHaveBeenCalledWith(
      `/api/conversations/${uuid(2)}/messages`,
      expect.anything()
    );
    expect(field).toHaveValue('a dark monster\n');

    await userEvent.type(field, 'with no tribute');
    await userEvent.keyboard('{Enter}');

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/conversations/${uuid(2)}/messages`,
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

    renderApp(`/c/${uuid(2)}`);
    await send('I want a dragon');

    const history = await screen.findByRole('region', { name: 'Messages' });

    await arrives(turn, {
      type: TurnEventName.TurnStart,
      userMessageId: uuid(11)
    });
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

    renderApp(`/c/${uuid(2)}`);
    await send('I want a dragon');

    const history = await screen.findByRole('region', { name: 'Messages' });

    await arrives(turn, {
      type: TurnEventName.TurnStart,
      userMessageId: uuid(11)
    });
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
    await arrives(turn, { type: TurnEventName.TurnEnd, messageId: uuid(12) });

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
      requestedUrls(fetchMock).filter(
        url => url === `/api/conversations/${uuid(2)}`
      )
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

    renderApp(`/c/${uuid(2)}`);
    await send('I want a dragon');

    const history = await screen.findByRole('region', { name: 'Messages' });

    await arrives(turn, {
      type: TurnEventName.TurnStart,
      userMessageId: uuid(11)
    });
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

    renderApp(`/c/${uuid(2)}`);
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

    renderApp(`/c/${uuid(2)}`);
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

    renderApp(`/c/${uuid(2)}`);
    await send('What about something that comes back from the graveyard?');

    const history = await screen.findByRole('region', { name: 'Messages' });

    await arrives(turn, {
      type: TurnEventName.TurnStart,
      userMessageId: uuid(11)
    });
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

    renderApp(`/c/${uuid(2)}`);
    await send('I want a dragon');

    const history = await screen.findByRole('region', { name: 'Messages' });

    await arrives(turn, {
      type: TurnEventName.TurnStart,
      userMessageId: uuid(11)
    });
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

    renderApp(`/c/${uuid(2)}`);

    const offered = within(
      await screen.findByRole('list', { name: 'What can be asked' })
    ).getAllByRole('listitem')[0].textContent;

    await userEvent.click(screen.getByRole('button', { name: offered }));

    expect(screen.getAllByText(offered)).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/conversations/${uuid(2)}/messages`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          text: offered,
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

    renderApp(`/c/${uuid(2)}`);
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

    renderApp(`/c/${uuid(2)}`);
    await send('I want a dragon');

    await arrives(turn, {
      type: TurnEventName.TurnStart,
      userMessageId: uuid(11)
    });

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

    const client = renderApp(`/c/${uuid(2)}`);
    await send('I want a dragon');

    const history = await screen.findByRole('region', { name: 'Messages' });

    await arrives(turn, {
      type: TurnEventName.TurnStart,
      userMessageId: uuid(11)
    });
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

    renderApp(`/c/${uuid(2)}`);
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

    renderApp(`/c/${uuid(2)}`);
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
});

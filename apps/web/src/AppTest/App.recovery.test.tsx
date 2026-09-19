import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TurnEventName, TurnStage } from '@ygo-assistant/contracts';

import {
  GRAVEYARD,
  LIGHT_ATTRIBUTE,
  type MessageFixture,
  arrives,
  createConversation,
  json,
  playerMessage,
  renderApp,
  said,
  send,
  stubFetch,
  turnStream,
  uuid,
  withMessages
} from './appTestHarness.js';

/**
 * What a conversation shows when a request was never answered: a request whose
 * turn produced no reply, and the one action that asks it again.
 */
describe('recovering an unanswered request', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('says a request was never answered and drops the previous search from the readout', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(
              withMessages(GRAVEYARD, [
                playerMessage(11, 'A light monster'),
                said(12, 'assistant', 'Try these.', {
                  search: { filters: [LIGHT_ATTRIBUTE] }
                }),
                playerMessage(13, 'Anything cheaper?')
              ])
            )
      )
    );

    renderApp(`/c/${uuid(2)}`);

    expect(
      await screen.findByText('This request was never answered.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ask it again' })
    ).toBeInTheDocument();

    // The last search belongs to the answer before it, not to the request that
    // was never answered, so it is not shown as the one this request will run.
    expect(
      screen.queryByRole('list', { name: 'What the search was understood as' })
    ).not.toBeInTheDocument();
  });

  it('asks an unanswered request again with the same words', async () => {
    const turn = turnStream();
    const fetchMock = stubFetch((url, init) =>
      init?.method === 'POST'
        ? turn.response
        : url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(
              withMessages(GRAVEYARD, [
                playerMessage(11, 'A light monster'),
                said(12, 'assistant', 'Try these.', {
                  search: { filters: [LIGHT_ATTRIBUTE] }
                }),
                playerMessage(13, 'Anything cheaper?')
              ])
            )
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp(`/c/${uuid(2)}`);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Ask it again' })
    );

    const posted = fetchMock.mock.calls
      .filter(call => call[1]?.method === 'POST')
      .at(-1);

    expect(JSON.parse(String(posted?.[1]?.body))).toEqual({
      text: 'Anything cheaper?',
      language: 'en',
      model: 'llama3.1:8b'
    });

    await act(async () => {
      turn.close();
    });
  });

  it('asks an unanswered request again on the search it ran with', async () => {
    const turn = turnStream();
    const retry = turnStream();
    let posts = 0;
    let stored: MessageFixture[] = [];
    const fetchMock = stubFetch((url, init) => {
      if (init?.method === 'POST') {
        posts += 1;

        return posts === 1 ? turn.response : retry.response;
      }

      const conversation = createConversation(2, { title: null });

      return url === '/api/conversations'
        ? json([conversation])
        : json(withMessages(conversation, stored));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderApp(`/c/${uuid(2)}`);
    await send('I want a light monster');

    await arrives(turn, {
      type: TurnEventName.TurnStart,
      userMessageId: uuid(11)
    });
    await arrives(turn, {
      type: TurnEventName.Filters,
      filters: [LIGHT_ATTRIBUTE],
      query: 'light monsters'
    });

    // The turn gives way after the search was reported, so the request is stored
    // and its reply is not: the search it ran with is what asking again runs.
    stored = [playerMessage(11, 'I want a light monster')];
    await arrives(turn, {
      type: TurnEventName.Error,
      stage: TurnStage.Search,
      message: 'The search failed'
    });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Ask it again' })
    );

    const posted = fetchMock.mock.calls
      .filter(call => call[1]?.method === 'POST')
      .at(-1);

    expect(JSON.parse(String(posted?.[1]?.body))).toEqual({
      text: 'I want a light monster',
      language: 'en',
      model: 'llama3.1:8b',
      filters: [LIGHT_ATTRIBUTE]
    });

    await act(async () => {
      retry.close();
    });
  });

  it('offers to ask again when a turn is refused before it starts, and the retry works from the keyboard', async () => {
    let posts = 0;
    const fetchMock = stubFetch((url, init) => {
      if (init?.method === 'POST') {
        posts += 1;

        return json({ error: 'The model qwen3:4b is not installed' }, 503);
      }

      return url === '/api/conversations'
        ? json([GRAVEYARD])
        : json(withMessages(GRAVEYARD, []));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderApp(`/c/${uuid(2)}`);
    await send('I want a dragon');

    expect(
      await screen.findByText('This request was never answered.')
    ).toBeInTheDocument();

    const again = screen.getByRole('button', { name: 'Ask it again' });
    again.focus();

    expect(again).toHaveFocus();

    await userEvent.keyboard('{Enter}');

    expect(posts).toBe(2);
  });
});

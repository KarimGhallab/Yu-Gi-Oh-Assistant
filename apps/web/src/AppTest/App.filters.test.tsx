import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CardType,
  FilterOperator,
  TurnEventName
} from '@ygo-assistant/contracts';

import {
  DARK_ATTRIBUTE,
  DARK_MAGICIAN,
  GRAVEYARD,
  LEVEL_AT_LEAST_7,
  LIGHT_ATTRIBUTE,
  type TurnStream,
  arrives,
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

describe('the search readout', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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

    renderApp(`/c/${uuid(2)}`);
    await send('light monsters of level 7 or more');

    await arrives(turn, {
      type: TurnEventName.TurnStart,
      userMessageId: uuid(11)
    });
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

    renderApp(`/c/${uuid(2)}`);

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

    renderApp(`/c/${uuid(2)}`);

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

    renderApp(`/c/${uuid(2)}`);

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
      `/api/conversations/${uuid(2)}/messages`,
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
      userMessageId: uuid(12)
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
      `/api/conversations/${uuid(2)}/messages`,
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

    renderApp(`/c/${uuid(2)}`);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Change attribute is DARK' })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));

    expect(await screen.findByText('No filters')).toBeInTheDocument();

    await send('a dark monster');

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/conversations/${uuid(2)}/messages`,
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

    renderApp(`/c/${uuid(2)}`);

    await screen.findByRole('button', { name: 'Change attribute is DARK' });
    await send('a light monster');

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/conversations/${uuid(2)}/messages`,
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

    renderApp(`/c/${uuid(2)}`);

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
      `/api/conversations/${uuid(2)}/messages`,
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

    renderApp(`/c/${uuid(2)}`);

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
});

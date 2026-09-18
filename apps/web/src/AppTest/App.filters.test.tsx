import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CardFilterField,
  CardRace,
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
    ).toEqual(['Attribute is light', 'Level at least 7']);

    await act(async () => {
      turn.close();
    });
  });

  it('reads the catalog its own words and leaves a typed value as it is', async () => {
    const stored = [
      playerMessage(10, 'a blue-eyes warrior'),
      said(11, 'assistant', 'Fits.', {
        filters: [
          {
            field: CardFilterField.Race,
            operator: FilterOperator.Eq,
            value: CardRace.BeastWarrior
          },
          {
            field: CardFilterField.Archetype,
            operator: FilterOperator.Contains,
            value: 'Blue-Eyes'
          }
        ]
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
    ).toEqual(['Race is beast-warrior', 'Archetype contains Blue-Eyes']);

    // The control reads the same words while what it sends stays the catalog's.
    await userEvent.click(
      screen.getByRole('button', { name: 'Change Race is beast-warrior' })
    );

    expect(
      within(screen.getByLabelText('Value')).getByRole('option', {
        name: 'beast-warrior'
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Value')).toHaveValue(CardRace.BeastWarrior);
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
    ).toEqual(['Attribute is dark']);
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
      await screen.findByRole('button', { name: 'Change Attribute is dark' })
    );
    await userEvent.selectOptions(screen.getByLabelText('Value'), 'LIGHT');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      screen.getByRole('button', { name: 'Change Attribute is light' })
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
      screen.getByRole('button', { name: 'Change Attribute is light' })
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

  it('marks the filter actions beside their words rather than instead of them', async () => {
    const stored = [
      playerMessage(10, 'a dark monster'),
      said(11, 'assistant', 'Dark Magician fits.', {
        filters: [DARK_ATTRIBUTE]
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

    const offer = await screen.findByRole('button', { name: 'Add a filter' });
    expect(offer.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');

    await userEvent.click(
      screen.getByRole('button', { name: 'Change Attribute is dark' })
    );

    // The word is what a screen reader hears; the mark before it is silent.
    for (const name of ['Save', 'Remove', 'Cancel']) {
      expect(
        screen.getByRole('button', { name }).querySelector('svg')
      ).toHaveAttribute('aria-hidden', 'true');
    }
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
      await screen.findByRole('button', { name: 'Change Attribute is dark' })
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

    await screen.findByRole('button', { name: 'Change Attribute is dark' });
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
    ).toEqual(['Attribute is dark', 'Type is normal monster']);

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
    await userEvent.selectOptions(screen.getByLabelText('Field'), 'race');

    expect(screen.getByLabelText('Value').tagName).toBe('SELECT');
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();
  });

  it('refuses a numeric value outside the bounds the game has', async () => {
    const stored = [
      playerMessage(10, 'a dark monster'),
      said(11, 'assistant', 'Fits.', { filters: [] })
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

    // A new filter starts on a level, which runs from 1 to 12.
    expect(screen.getByLabelText('Value')).toHaveAttribute('min', '1');
    expect(screen.getByLabelText('Value')).toHaveAttribute('max', '12');

    await userEvent.type(screen.getByLabelText('Value'), '13');
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();

    await userEvent.clear(screen.getByLabelText('Value'));
    await userEvent.type(screen.getByLabelText('Value'), '12');
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled();

    // Attack points run from 0 to 9000.
    await userEvent.selectOptions(screen.getByLabelText('Field'), 'atk');
    expect(screen.getByLabelText('Value')).toHaveAttribute('min', '0');
    expect(screen.getByLabelText('Value')).toHaveAttribute('max', '9000');
  });
});

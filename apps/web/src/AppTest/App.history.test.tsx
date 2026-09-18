import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CardFilterField,
  CardRace,
  FilterOperator
} from '@ygo-assistant/contracts';

import {
  BLUE_EYES,
  DARK_MAGICIAN,
  GRAVEYARD,
  RED_EYES,
  assistantMessage,
  clearFocus,
  createCard,
  createConversation,
  json,
  playerMessage,
  renderApp,
  said,
  settingControl,
  stubFetch,
  uuid,
  withMessages
} from './appTestHarness.js';

describe('reading a conversation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps what a stored request was searched as with the request', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(() =>
        json(
          withMessages(GRAVEYARD, [
            playerMessage(11, 'A card that lets me get a spell back'),
            said(12, 'assistant', 'Try Magical Stone Excavation', {
              search: {
                filters: [],
                query: 'add 1 Spell from your GY to your hand'
              },
              cards: [DARK_MAGICIAN]
            })
          ])
        )
      )
    );

    renderApp(`/c/${uuid(2)}`);

    const caption = await screen.findByText('Searched as');

    expect(caption.parentElement).toHaveClass('sr-only');
    expect(
      screen.getByText('add 1 Spell from your GY to your hand')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Searched as' })
    ).not.toBeInTheDocument();
  });

  it('shows the filters a no-result answer was searched with', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(
              withMessages(GRAVEYARD, [
                playerMessage(11, 'A dragon'),
                said(12, 'assistant', 'No card matched every filter: Race.', {
                  search: {
                    filters: [
                      {
                        field: CardFilterField.Race,
                        operator: FilterOperator.Eq,
                        value: CardRace.Dragon
                      }
                    ]
                  },
                  cards: []
                })
              ])
            )
      )
    );

    renderApp(`/c/${uuid(2)}`);

    const history = await screen.findByRole('region', { name: 'Messages' });

    // The empty result keeps the search it ran with, in the readout's own
    // words, so it reads as a search that came back empty rather than a dead
    // end.
    expect(
      within(history).getByRole('list', {
        name: 'Filters the search ran with'
      })
    ).toBeInTheDocument();
    expect(within(history).getByText('Race')).toBeInTheDocument();
    expect(within(history).getByText('is dragon')).toBeInTheDocument();
  });

  it('renders an answer as the Markdown the model writes', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(() =>
        json(
          withMessages(GRAVEYARD, [
            playerMessage(11, 'a dark monster'),
            assistantMessage(
              12,
              '**Dark Magician** fits.\n\n- it is a Spellcaster\n- [Read more](https://example.com/card)\n\n<script>alert(1)</script>'
            )
          ])
        )
      )
    );

    renderApp(`/c/${uuid(2)}`);

    const history = await screen.findByRole('region', { name: 'Messages' });

    // A card's name is weight, and the syntax that asked for it is gone.
    expect(within(history).getByText('Dark Magician').tagName).toBe('STRONG');
    expect(within(history).queryByText('**Dark Magician**')).toBeNull();

    // A list is a list, and a link is the one action the prose carries.
    expect(
      within(history).getByText('it is a Spellcaster').closest('ul')
    ).not.toBeNull();

    const link = within(history).getByRole('link', { name: 'Read more' });
    expect(link).toHaveAttribute('href', 'https://example.com/card');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');

    // Raw HTML is dropped rather than rendered.
    expect(within(history).queryByText('alert(1)')).toBeNull();
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

    renderApp(`/c/${uuid(2)}`);

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

    renderApp(`/c/${uuid(2)}`);

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
      within(cards).getByRole('button', { name: 'Blue-Eyes White Dragon' })
    ).toBeInTheDocument();
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

    renderApp(`/c/${uuid(2)}`);

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
      within(cards).getByRole('button', { name: 'Blue-Eyes White Dragon' })
    ).toBeInTheDocument();
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

    renderApp(`/c/${uuid(2)}`);

    expect(
      await screen.findByRole('heading', { name: 'Ask for cards' })
    ).toBeInTheDocument();
    // Four of the fifty are drawn, so the test counts them rather than naming
    // them: which four is the point of drawing.
    expect(
      within(
        screen.getByRole('list', { name: 'What can be asked' })
      ).getAllByRole('listitem')
    ).toHaveLength(4);
  });

  it('reaches each card, and the prompt after them, without a mouse', async () => {
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

    renderApp(`/c/${uuid(2)}`);
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
      screen.getByRole('button', { name: 'Blue-Eyes White Dragon' })
    ).toHaveFocus();

    await userEvent.tab();

    expect(screen.getByRole('button', { name: 'Dark Magician' })).toHaveFocus();

    // The prompt comes after the conversation, because that is the order the
    // surface is read in, and it holds everything the request is run with: the
    // field, the language it is read in, the model that answers, and the Send.
    await userEvent.tab();

    expect(screen.getByRole('textbox', { name: 'Your request' })).toHaveFocus();

    await userEvent.tab();

    expect(await settingControl('Cards in')).toHaveFocus();

    await userEvent.tab();

    expect(await settingControl('Answered by')).toHaveFocus();

    // The Send is out of the tab order while there is nothing to send, so the
    // prompt's own controls are where the surface's stops end.
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it("opens a card's printed face, with its source, and gives focus back", async () => {
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

    renderApp(`/c/${uuid(2)}`);

    const history = await screen.findByRole('region', { name: 'Messages' });
    const cards = within(history).getByRole('list', {
      name: 'Suggested cards'
    });
    const tile = within(cards).getByRole('button', {
      name: 'Blue-Eyes White Dragon'
    });

    await userEvent.click(tile);

    // The card is the whole of what the face carries: the facts are on the
    // printed face itself, so nothing is restated beside it.
    const face = screen.getByRole('dialog', {
      name: 'Blue-Eyes White Dragon'
    });
    expect(face.querySelector('img')).toHaveAttribute(
      'src',
      BLUE_EYES.imageUrl
    );
    expect(within(face).queryByText(BLUE_EYES.effect)).toBeNull();

    // The tile's own link is gone; the source travels with the face instead.
    const source = within(face).getByRole('link', {
      name: 'View on YGOPRODeck'
    });
    expect(source).toHaveAttribute('href', BLUE_EYES.sourceUrl);
    expect(source).toHaveAttribute('target', '_blank');

    // The keyboard is on the way out, and the source is the next stop.
    expect(
      within(face).getByRole('button', { name: 'Close the card' })
    ).toHaveFocus();

    await userEvent.tab();

    expect(source).toHaveFocus();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(tile).toHaveFocus();
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
                  search: { filters: [] },
                  cards: [french, english]
                })
              ])
            )
      )
    );

    renderApp(`/c/${uuid(2)}`);

    const cards = await screen.findByRole('list', { name: 'Suggested cards' });
    const [magicien, greed] = within(cards).getAllByRole('listitem');

    // The card the language has carries nothing, and is still announced by its
    // name alone: the marker of the other one is not part of any card's label.
    expect(within(magicien).queryByText('FR only')).toBeNull();
    expect(
      within(magicien).getByRole('button', { name: 'Magicien Sombre' })
    ).toBeInTheDocument();

    // The card only in English says which language it is in.
    expect(within(greed).getByText('EN only')).toBeInTheDocument();
    expect(
      within(greed).getByRole('button', { name: 'Pot of Greed' })
    ).toBeInTheDocument();
  });
});

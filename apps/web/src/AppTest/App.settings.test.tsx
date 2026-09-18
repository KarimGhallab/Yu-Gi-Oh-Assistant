import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  GRAVEYARD,
  createCard,
  createConversation,
  json,
  pickSetting,
  playerMessage,
  renderApp,
  said,
  send,
  settingControl,
  stubFetch,
  turnStream,
  uuid,
  withMessages
} from './appTestHarness.js';

describe('the conversation settings', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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

    renderApp(`/c/${uuid(2)}`);

    expect(
      await screen.findByRole('button', { name: 'Dark Magician' })
    ).toBeInTheDocument();

    await pickSetting('Cards in', 'French');

    // The same turn comes back in the other language, and it is the same turn:
    // the cards were read again rather than the question answered twice.
    expect(
      await screen.findByRole('button', { name: 'Magicien Sombre' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dark Magician' })).toBeNull();
    expect(screen.getAllByText('Assistant')).toHaveLength(1);

    // The turn that follows is searched in the language that is on screen.
    await send('a dark monster');

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/conversations/${uuid(2)}/messages`,
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

    renderApp(`/c/${uuid(2)}`);

    expect(await settingControl('Cards in')).toHaveTextContent('French');
    expect(
      await screen.findByRole('button', { name: 'Magicien Sombre' })
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

    renderApp(`/c/${uuid(2)}`);

    await pickSetting('Cards in', 'French');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The conversation could not be changed'
    );
    expect(await settingControl('Cards in')).toHaveTextContent('English');
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

    renderApp(`/c/${uuid(2)}`);

    const chooser = await settingControl('Answered by');

    await userEvent.click(chooser);

    // Every model the machine has, each saying what it can do beside its name,
    // and the one the conversation is on marked as the one that is on.
    expect(screen.getByRole('option', { name: 'llama3.1:8b' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(
      screen.getByRole('option', { name: /mistral:7b.*no structured filters/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /nomic-embed-text.*cannot answer/ })
    ).toBeInTheDocument();
    expect(chooser).toHaveTextContent('llama3.1:8b');
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

    renderApp(`/c/${uuid(2)}`);

    await pickSetting('Answered by', /^mistral:7b/);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/conversations/${uuid(2)}`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ model: 'mistral:7b' })
      })
    );

    await send('a dark monster');

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/conversations/${uuid(2)}/messages`,
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

    renderApp(`/c/${uuid(2)}`);

    expect(await settingControl('Answered by')).toHaveTextContent(
      'llama3.1:8b'
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Run ollama pull llama3.1:8b to install it.'
    );
  });

  it('opens a setting above its control, and calls it off from the keyboard', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([createConversation(2)])
          : json(withMessages(createConversation(2)))
      )
    );

    renderApp(`/c/${uuid(2)}`);

    const control = await settingControl('Answered by');

    await userEvent.click(control);

    expect(
      screen.getByRole('listbox', { name: 'Answered by' })
    ).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(control).toHaveFocus();
  });
});

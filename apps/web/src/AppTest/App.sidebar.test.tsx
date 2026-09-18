import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  GRAVEYARD,
  UNTITLED,
  asNarrowWindow,
  clearFocus,
  createConversation,
  json,
  notFound,
  playerMessage,
  renderApp,
  requestedUrls,
  said,
  stubFetch,
  uuid,
  withMessages
} from './appTestHarness.js';

/**
 * One stored turn, so the conversation has the header its name lives in. A
 * conversation with nothing in it draws the bench instead and carries no title,
 * which is the truth these rail tests are not about.
 */
const spoken = (): ReturnType<typeof withMessages> =>
  withMessages(GRAVEYARD, [
    playerMessage(11, 'I want a dragon'),
    said(12, 'assistant', 'Blue-Eyes is the biggest body.')
  ]);

describe('the conversation list', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the sidebar in a bar and a drawer on a narrow window', async () => {
    const restore = asNarrowWindow();

    try {
      vi.stubGlobal(
        'fetch',
        stubFetch(url =>
          url === '/api/conversations'
            ? json([GRAVEYARD])
            : json(withMessages(GRAVEYARD))
        )
      );
      renderApp('/');

      // The bar is what a narrow window keeps: the way in, the name, and the way
      // to start a conversation. Its mark says where it is, and says so the same
      // way whether the list is open or shut.
      const mark = await screen.findByRole('button', {
        name: 'Show the conversations'
      });
      expect(
        screen.getByRole('button', { name: 'New conversation' })
      ).toBeInTheDocument();
      expect(mark).toHaveAttribute('aria-expanded', 'false');

      // The drawer is closed but mounted, so it can arrive rather than appear.
      const drawer = document.getElementById('sidebar-drawer');
      expect(drawer).toHaveAttribute('inert');

      await userEvent.click(mark);

      expect(mark).toHaveAttribute('aria-expanded', 'true');
      expect(drawer).not.toHaveAttribute('inert');

      // The drawer's own mark closes it, because the bar's is behind the dimmed
      // chat by then.
      await userEvent.click(
        screen.getByRole('button', { name: 'Hide the conversations' })
      );

      expect(mark).toHaveAttribute('aria-expanded', 'false');
      expect(drawer).toHaveAttribute('inert');

      // And so does choosing a conversation: the drawer watches where the player
      // went, so every way out of the list closes it the same way.
      await userEvent.click(mark);
      await userEvent.click(
        screen.getByRole('link', { name: 'Graveyard toolbox' })
      );

      expect(mark).toHaveAttribute('aria-expanded', 'false');
      expect(drawer).toHaveAttribute('inert');
    } finally {
      restore();
    }
  });

  it('lists the conversations the server has, in the order it lists them', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD, UNTITLED])
          : notFound(uuid(999))
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

    renderApp(`/c/${uuid(2)}`);

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
      if (url === `/api/conversations/${uuid(7)}`) {
        return json(withMessages(created));
      }
      return json([GRAVEYARD]);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/');

    await userEvent.click(
      await screen.findByRole('button', { name: 'New conversation' })
    );

    // The new conversation holds nothing, so it opens on the bench rather than a
    // title it has not earned; the sidebar is what names it.
    expect(
      await screen.findByRole('heading', { name: 'Start a conversation' })
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/conversations',
      expect.objectContaining({ method: 'POST' })
    );
    expect(requestedUrls(fetchMock)).toContain(`/api/conversations/${uuid(7)}`);
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

    renderApp(`/c/${uuid(2)}`);

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

    renderApp(`/c/${uuid(2)}`);

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

    renderApp(`/c/${uuid(2)}`);

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
        url === '/api/conversations' ? json([GRAVEYARD]) : json(spoken())
      )
    );

    renderApp(`/c/${uuid(2)}`);
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
        url === '/api/conversations' ? json([GRAVEYARD]) : json(spoken())
      )
    );

    renderApp(`/c/${uuid(2)}`);
    await screen.findByRole('region', { name: 'Messages' });

    await userEvent.click(
      screen.getByRole('button', { name: 'Hide the conversations' })
    );

    const mark = screen.getByRole('link', { name: 'Graveyard toolbox' });
    await userEvent.hover(mark);

    // The mark shows one letter; pointing at it shows the whole name, and the
    // sidebar is where the name is looked for.
    const sidebar = within(screen.getByRole('complementary'));
    expect(sidebar.getByText('Graveyard toolbox')).toBeInTheDocument();

    await userEvent.unhover(mark);

    expect(sidebar.queryByText('Graveyard toolbox')).not.toBeInTheDocument();
  });

  it('does nothing when the rail itself is pointed at', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations' ? json([GRAVEYARD]) : json(spoken())
      )
    );

    renderApp(`/c/${uuid(2)}`);
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

  it("reaches a conversation's actions without a mouse", async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(withMessages(GRAVEYARD))
      )
    );

    renderApp(`/c/${uuid(2)}`);
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

    expect(
      screen.getByRole('alertdialog', { name: 'Delete this conversation?' })
    ).toBeInTheDocument();

    // The question takes the keyboard with it, onto its own surface; the answer
    // that changes nothing is one Tab away.
    expect(screen.getByRole('alertdialog')).toHaveFocus();

    await userEvent.tab();

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
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

    renderApp(`/c/${uuid(2)}`);
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

  it('reaches the conversations without a mouse', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations' ? json([GRAVEYARD]) : notFound(uuid(999))
      )
    );

    renderApp('/');
    await screen.findByRole('link', { name: 'Graveyard toolbox' });
    clearFocus();

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

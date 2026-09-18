import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  GRAVEYARD,
  UNTITLED,
  createConversation,
  json,
  renderApp,
  stubFetch,
  uuid,
  withMessages
} from './appTestHarness.js';

describe('renaming and deleting a conversation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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

    renderApp(`/c/${uuid(2)}`);

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
      `/api/conversations/${uuid(2)}`,
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

    renderApp(`/c/${uuid(2)}`);

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
        listed = listed.filter(conversation => conversation.id !== uuid(1));
        return new Response(null, { status: 204 });
      }

      return url === '/api/conversations'
        ? json(listed)
        : json(withMessages(GRAVEYARD));
    });
    vi.stubGlobal('fetch', fetchMock);

    renderApp(`/c/${uuid(2)}`);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete New conversation' })
    );

    // Nothing is deleted until the question has been answered, and the dialog
    // says which conversation it is about.
    expect(
      screen.getByRole('alertdialog', { name: 'Delete this conversation?' })
    ).toHaveTextContent('Everything in New conversation will be gone.');
    expect(
      fetchMock.mock.calls.some(call => call[1]?.method === 'DELETE')
    ).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

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

    renderApp(`/c/${uuid(2)}`);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete Graveyard toolbox' })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

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

    renderApp(`/c/${uuid(2)}`);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Rename Graveyard toolbox' })
    );

    // The dialog takes the keyboard; the field is the first stop it offers.
    expect(screen.getByRole('alertdialog')).toHaveFocus();

    await userEvent.tab();

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

  it("asks for a conversation's new name in a dialog of its own", async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(withMessages(GRAVEYARD))
      )
    );

    renderApp(`/c/${uuid(2)}`);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Rename Graveyard toolbox' })
    );

    // The row goes on being a row: what is being named is still readable under
    // the question, which is not true when the row turns into a field.
    expect(
      screen.getByRole('alertdialog', { name: 'Rename this conversation?' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Graveyard toolbox' })
    ).toBeInTheDocument();

    // The name it has is what the question starts from, offered selected, and
    // the dialog holds the keyboard with the field one Tab away.
    const field = screen.getByRole('textbox', {
      name: 'Conversation name'
    }) as HTMLInputElement;
    expect(field).toHaveValue('Graveyard toolbox');
    expect(field.selectionStart).toBe(0);
    expect(field.selectionEnd).toBe('Graveyard toolbox'.length);

    expect(screen.getByRole('alertdialog')).toHaveFocus();

    await userEvent.tab();

    expect(field).toHaveFocus();
  });

  it('leaves a rename alone when it is called off', async () => {
    const fetchMock = stubFetch(url =>
      url === '/api/conversations'
        ? json([GRAVEYARD])
        : json(withMessages(GRAVEYARD))
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp(`/c/${uuid(2)}`);

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

    renderApp(`/c/${uuid(2)}`);

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

    renderApp(`/c/${uuid(2)}`);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete Graveyard toolbox' })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(
      await screen.findByRole('heading', { name: 'Start a conversation' })
    ).toBeInTheDocument();
  });

  it('shows the region that took the room, and keeps the keyboard on its two answers', async () => {
    vi.stubGlobal(
      'fetch',
      stubFetch(url =>
        url === '/api/conversations'
          ? json([GRAVEYARD])
          : json(withMessages(GRAVEYARD))
      )
    );

    renderApp(`/c/${uuid(2)}`);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete Graveyard toolbox' })
    );

    // The dialog itself takes the keyboard and draws the ring, whoever opened
    // it, so the region that just took the room is the one that reads as
    // focused.
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveFocus();
    expect(dialog).toHaveClass('focus:outline-2');

    // Shift+Tab from the surface lands on the last answer, so the keyboard
    // never walks off into the list behind; Tab then moves to the first.
    await userEvent.tab({ shift: true });

    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();

    await userEvent.tab();

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    await userEvent.tab();

    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
  });

  it('calls a deletion off from the keyboard, and from the room outside it', async () => {
    const fetchMock = stubFetch(url =>
      url === '/api/conversations'
        ? json([GRAVEYARD])
        : json(withMessages(GRAVEYARD))
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp(`/c/${uuid(2)}`);

    const ask = async (): Promise<void> =>
      userEvent.click(
        await screen.findByRole('button', { name: 'Delete Graveyard toolbox' })
      );

    await ask();
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(
      fetchMock.mock.calls.some(call => call[1]?.method === 'DELETE')
    ).toBe(false);

    await ask();
    await userEvent.click(document.body);

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(
      fetchMock.mock.calls.some(call => call[1]?.method === 'DELETE')
    ).toBe(false);
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

    renderApp(`/c/${uuid(2)}`);

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
});

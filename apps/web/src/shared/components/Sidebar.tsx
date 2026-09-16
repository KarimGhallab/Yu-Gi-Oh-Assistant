import {
  type KeyboardEvent,
  type SubmitEvent,
  useEffect,
  useRef,
  useState
} from 'react';
import { Link, NavLink, useMatch, useNavigate } from 'react-router';

import { conversationTitle } from '../conversationTitle.js';
import {
  useConversations,
  useDeleteConversation,
  useRenameConversation,
  useStartConversation
} from '../queries.js';

const BRAND_CLASS =
  'min-w-0 truncate rounded text-sm font-semibold tracking-wide text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';

const START_CLASS =
  'shrink-0 rounded bg-amber-500 px-2.5 py-1.5 text-sm font-medium whitespace-nowrap text-amber-950 hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:opacity-60';

const ROW_FORM_CLASS = 'flex items-center gap-1 py-0.5 pl-2';

const ROW_FIELD_CLASS =
  'min-w-0 flex-1 rounded border border-amber-500/25 bg-neutral-900 px-1.5 py-1 text-sm text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';

/**
 * A quiet action on a row. It is text rather than a control, so the list stays
 * a list of conversations; it comes forward when the row is pointed at or
 * reached, and it is always announced, because opacity is not what assistive
 * technology reads.
 */
const ROW_ACTION_CLASS =
  'shrink-0 rounded px-1 text-sm text-neutral-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-neutral-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';

/** A control of the row that is being edited or confirmed, always visible. */
const ROW_BUTTON_CLASS =
  'shrink-0 rounded px-1 text-sm text-neutral-400 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';

const conversationLinkClass = ({ isActive }: { isActive: boolean }): string =>
  `min-w-0 flex-1 truncate rounded px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
    isActive
      ? 'bg-neutral-800 text-neutral-100'
      : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-100'
  }`;

/**
 * What a row is doing instead of showing its conversation: being renamed, or
 * waiting to be told that deleting it was meant. One row is in one of these at a
 * time, so the list never turns into a wall of controls.
 */
type Editing =
  | { kind: 'rename'; id: number; title: string }
  | { kind: 'deleting'; id: number };

/**
 * Where focus goes once a row's controls have closed: the row that was being
 * worked on, or the row that took its place in the list, or the control that
 * starts a new one when there is no list left.
 */
type Refocus = number | 'new';

/** Names the row a player is put back on once its controls have closed. */
const conversationLinkId = (id: number): string => `conversation-link-${id}`;

/** Names the question a deletion asks, so the confirmation reads as the answer. */
const deleteQuestionId = (id: number): string => `delete-question-${id}`;

/**
 * The conversations that can be reopened, the control that starts one, and the
 * two things a conversation can have done to it. Which conversation is open is
 * the address's business, so the link that is marked is the one the address
 * names, and the list is where a conversation is renamed or deleted.
 */
export default function Sidebar() {
  const conversations = useConversations();
  const startConversation = useStartConversation();
  const rename = useRenameConversation();
  const remove = useDeleteConversation();
  const navigate = useNavigate();
  const openId = useMatch('/c/:conversationId')?.params.conversationId;
  const [editing, setEditing] = useState<Editing | undefined>(undefined);
  const [refocus, setRefocus] = useState<Refocus | undefined>(undefined);
  const nameField = useRef<HTMLInputElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const newConversation = useRef<HTMLButtonElement>(null);

  // Opening a row's controls moves the player into them, so the keyboard does
  // not have to find its way back to where the row just changed underneath it.
  useEffect(() => {
    if (editing?.kind === 'rename') {
      nameField.current?.focus();
      nameField.current?.select();
    }

    if (editing?.kind === 'deleting') {
      deleteButton.current?.focus();
    }
  }, [editing?.kind, editing?.id]);

  // Closing them moves the player back out, which has to wait for the row to be
  // a row again: the link being returned to does not exist while a field or a
  // confirmation has taken its place.
  useEffect(() => {
    if (editing !== undefined || refocus === undefined) {
      return;
    }

    const row =
      typeof refocus === 'number'
        ? document.getElementById(conversationLinkId(refocus))
        : null;

    (row ?? newConversation.current)?.focus();
    setRefocus(undefined);
  }, [editing, refocus]);

  /** Closes whatever a row was doing, and puts the keyboard back on it. */
  const closeEditing = (id: number): void => {
    setEditing(undefined);
    setRefocus(id);
  };

  const cancelOnEscape =
    (id: number): ((event: KeyboardEvent) => void) =>
    (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        closeEditing(id);
      }
    };

  /**
   * Where the keyboard goes when a row is gone: the conversation that took its
   * place in the list, or the one that was in front of it, or the control that
   * starts a new one.
   */
  const neighbourOf = (id: number): Refocus => {
    const list = conversations.data ?? [];
    const index = list.findIndex(conversation => conversation.id === id);
    const next = list[index + 1] ?? list[index - 1];

    return next?.id ?? 'new';
  };

  const start = async (): Promise<void> => {
    startConversation.reset();

    try {
      const conversation = await startConversation.mutateAsync();
      await navigate(`/c/${conversation.id}`);
    } catch {
      // The failure is the mutation's own error, rendered above the list.
    }
  };

  const save = async (id: number, title: string): Promise<void> => {
    rename.reset();
    remove.reset();
    closeEditing(id);

    // A name that is only space leaves the conversation as it was, which is what
    // clearing the field and saving asks for.
    const name = title.trim();

    if (name.length === 0) {
      return;
    }

    try {
      await rename.mutateAsync({ id: String(id), title: name });
    } catch {
      // The conversation keeps the name it had, and the error above the list is
      // what says the new one was not taken.
    }
  };

  const confirmDelete = async (id: number): Promise<void> => {
    rename.reset();
    remove.reset();
    setEditing(undefined);

    const wasOpen = openId === String(id);
    const next = neighbourOf(id);

    try {
      await remove.mutateAsync(String(id));

      if (wasOpen) {
        await navigate('/');
      }

      setRefocus(wasOpen ? 'new' : next);
    } catch {
      // The conversation is still there, and the error above the list says why.
      setRefocus(id);
    }
  };

  const failure =
    startConversation.error ?? rename.error ?? remove.error ?? undefined;

  return (
    <aside className="flex max-h-64 shrink-0 flex-col border-b border-neutral-800 bg-neutral-900 md:h-screen md:max-h-none md:w-72 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between gap-3 p-4">
        <Link to="/" className={BRAND_CLASS}>
          Yu-Gi-Oh Assistant
        </Link>
        <button
          type="button"
          ref={newConversation}
          className={START_CLASS}
          aria-label="New conversation"
          onClick={() => void start()}
          disabled={startConversation.isPending}>
          New
        </button>
      </div>

      {failure === undefined ? null : (
        <p role="alert" className="px-4 pb-2 text-sm text-red-400">
          {failure.message}
        </p>
      )}

      <nav
        aria-label="Conversations"
        className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {conversations.isPending ? (
          <p role="status" className="px-2 py-1 text-sm text-neutral-500">
            Loading conversations…
          </p>
        ) : null}

        {conversations.isError ? (
          <p role="alert" className="px-2 py-1 text-sm text-red-400">
            {conversations.error.message}
          </p>
        ) : null}

        <ul className="space-y-1">
          {(conversations.data ?? []).map(conversation => (
            <li key={conversation.id} className="group">
              {editing?.kind === 'rename' && editing.id === conversation.id ? (
                <form
                  className={ROW_FORM_CLASS}
                  onKeyDown={cancelOnEscape(conversation.id)}
                  onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    void save(conversation.id, editing.title);
                  }}>
                  <label
                    htmlFor={`conversation-name-${conversation.id}`}
                    className="sr-only">
                    Conversation name
                  </label>
                  <input
                    id={`conversation-name-${conversation.id}`}
                    ref={nameField}
                    value={editing.title}
                    onChange={event =>
                      setEditing({
                        kind: 'rename',
                        id: conversation.id,
                        title: event.target.value
                      })
                    }
                    className={ROW_FIELD_CLASS}
                  />
                  <button type="submit" className={ROW_BUTTON_CLASS}>
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => closeEditing(conversation.id)}
                    className={ROW_BUTTON_CLASS}>
                    Cancel
                  </button>
                </form>
              ) : editing?.kind === 'deleting' &&
                editing.id === conversation.id ? (
                <div
                  className={ROW_FORM_CLASS}
                  onKeyDown={cancelOnEscape(conversation.id)}>
                  <p
                    id={deleteQuestionId(conversation.id)}
                    role="alert"
                    className="min-w-0 flex-1 truncate text-sm text-neutral-100">
                    Delete this conversation?
                  </p>
                  <button
                    type="button"
                    ref={deleteButton}
                    aria-label={`Delete ${conversationTitle(conversation)}`}
                    aria-describedby={deleteQuestionId(conversation.id)}
                    onClick={() => void confirmDelete(conversation.id)}
                    className={ROW_BUTTON_CLASS}>
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => closeEditing(conversation.id)}
                    className={ROW_BUTTON_CLASS}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <NavLink
                    to={`/c/${conversation.id}`}
                    id={conversationLinkId(conversation.id)}
                    className={conversationLinkClass}>
                    {conversationTitle(conversation)}
                  </NavLink>
                  <button
                    type="button"
                    aria-label={`Rename ${conversationTitle(conversation)}`}
                    onClick={() =>
                      setEditing({
                        kind: 'rename',
                        id: conversation.id,
                        title: conversationTitle(conversation)
                      })
                    }
                    className={ROW_ACTION_CLASS}>
                    Rename
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${conversationTitle(conversation)}`}
                    onClick={() =>
                      setEditing({ kind: 'deleting', id: conversation.id })
                    }
                    className={ROW_ACTION_CLASS}>
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useMatch, useNavigate } from 'react-router';

import {
  useConversations,
  useDeleteConversation,
  useRenameConversation,
  useStartConversation
} from '../conversationQueries.js';
import { conversationTitle } from '../conversationTitle.js';
import DeleteDialog from './DeleteDialog.js';
import RenameDialog from './RenameDialog.js';
import MonogramIcon from './icons/MonogramIcon.js';
import PanelFoldIcon from './icons/PanelFoldIcon.js';
import PanelOpenIcon from './icons/PanelOpenIcon.js';
import PencilIcon from './icons/PencilIcon.js';
import PlusIcon from './icons/PlusIcon.js';
import TrashIcon from './icons/TrashIcon.js';

const BRAND_CLASS =
  'min-w-0 truncate rounded text-sm font-semibold tracking-wide text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';

const START_CLASS =
  'inline-flex shrink-0 items-center gap-1.5 rounded bg-amber-500 px-2.5 py-1.5 text-sm font-medium whitespace-nowrap text-amber-950 hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:opacity-60';

/**
 * A quiet action on a row. It is a mark rather than a word, so the list stays a
 * list of conversations; it comes forward when the row is pointed at or
 * reached, and it is named for the conversation it acts on, because opacity is
 * not what assistive technology reads and neither is a glyph.
 */
const ROW_ACTION_CLASS =
  'inline-flex shrink-0 items-center justify-center rounded p-1.5 text-neutral-400 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-neutral-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';

/**
 * The control that folds the conversations away, and brings them back. Its box is
 * padded to the height of the controls beside it and pinned to the sidebar's
 * padding edge, so it sits in the same place whether the header is a row or a
 * column: a control that moved a couple of pixels as the sidebar changed state
 * would read as a nudge.
 */
const FOLD_CLASS =
  'shrink-0 rounded p-2 text-neutral-400 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';

/**
 * The folded list: one mark per conversation, a column on a wide window and a
 * row that scrolls sideways on a narrow one.
 */
const RAIL_CLASS =
  'flex min-h-0 gap-2 overflow-x-auto px-2 pt-2 pb-3 md:flex-1 md:flex-col md:overflow-x-visible md:overflow-y-auto md:px-0 md:pt-2 md:pb-0';

/**
 * One conversation, folded: the first letter of its name, and its whole name for
 * assistive technology. The letter is enough to recognise a conversation by, and
 * not enough to name it, which is what pointing at the rail is for.
 */
const MARK_CLASS = (open: boolean): string =>
  `inline-flex h-9 w-9 shrink-0 items-center justify-center rounded text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
    open
      ? 'bg-neutral-800 text-neutral-100'
      : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-100'
  }`;

/**
 * The row's surface: one conversation and its own controls on the one fill, so
 * an action sits on the row it belongs to rather than beside it. It is the row
 * that draws the focus outline for its name, because a ring around the name
 * alone would sit inside the fill and box the row in two.
 */
const rowClass = (open: boolean): string =>
  `flex items-center gap-1 rounded px-2 has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-amber-300 ${
    open
      ? 'bg-neutral-800 text-neutral-100'
      : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-100'
  }`;

const conversationLinkClass =
  'min-w-0 flex-1 truncate py-1.5 text-sm focus-visible:outline-none';

/**
 * What a row is doing instead of showing its conversation: being renamed, or
 * waiting to be told that deleting it was meant. One row is in one of these at a
 * time, so the list never turns into a wall of controls.
 */
type Editing =
  { kind: 'rename'; id: string } | { kind: 'deleting'; id: string };

/** A folded conversation's name, and where on screen to put it. */
interface NamedMark {
  name: string;
  top: number;
  left: number;
  centred: boolean;
}

/**
 * Where focus goes once a row's controls have closed: the row that was being
 * worked on, or the row that took its place in the list, or the control that
 * starts a new one when there is no list left. A conversation's id is a UUID, so
 * the two cases are kept apart by name rather than by what a value looks like:
 * nothing about an id says whether it names a row or the control that makes one.
 */
type Refocus = { kind: 'row'; id: string } | { kind: 'new' };

/** Names the row a player is put back on once its controls have closed. */
const conversationLinkId = (id: string): string => `conversation-link-${id}`;

/**
 * The conversations that can be reopened, the control that starts one, and the
 * two things a conversation can have done to it. Which conversation is open is
 * the address's business, so the link that is marked is the one the address
 * names, and the list is where a conversation is renamed or deleted.
 */
interface SidebarProps {
  /**
   * Whether the sidebar brings its own header: the fold control, the name and the
   * way to start a conversation. It does on a wide window, where the sidebar is
   * the only chrome there is. The drawer on a narrow one is opened from a bar that
   * already carries all three, so it opens with the list alone.
   */
  withHeader?: boolean;
}

export default function Sidebar({ withHeader = true }: SidebarProps) {
  const conversations = useConversations();
  const startConversation = useStartConversation();
  const rename = useRenameConversation();
  const remove = useDeleteConversation();
  const navigate = useNavigate();
  const openId = useMatch('/c/:conversationId')?.params.conversationId;
  const [editing, setEditing] = useState<Editing | undefined>(undefined);
  const [refocus, setRefocus] = useState<Refocus | undefined>(undefined);
  const newConversation = useRef<HTMLButtonElement>(null);

  /**
   * Whether the conversations are folded away. Folded, the list is a rail of one
   * mark per conversation: enough to recognise one by and not enough to name it,
   * so pointing at or focusing a mark shows the whole name beside it. Pointing at
   * the rail itself does nothing, and the fold control rather than any hover is
   * what brings the list back.
   */
  const [folded, setFolded] = useState(false);

  /**
   * The folded conversation whose name is being shown, and where to show it. The
   * name is placed from the mark's own box and fixed to the window, because the
   * rail scrolls: anything positioned inside a scrolling rail is clipped by it,
   * and a name is wider than the rail.
   */
  const [named, setNamed] = useState<NamedMark | undefined>(undefined);

  // Closing them moves the player back out, which has to wait for the row to be
  // a row again: the link being returned to does not exist while a field or a
  // confirmation has taken its place.
  useEffect(() => {
    if (editing !== undefined || refocus === undefined) {
      return;
    }

    const row =
      refocus.kind === 'row'
        ? document.getElementById(conversationLinkId(refocus.id))
        : null;

    (row ?? newConversation.current)?.focus();
    setRefocus(undefined);
  }, [editing, refocus]);

  /**
   * Folds the list away or brings it back. Folding closes a row that was being
   * edited or confirmed, because the field it was showing is not on screen once
   * the list is a rail; unfolding leaves one alone, because it is.
   */
  const fold = (next: boolean): void => {
    setNamed(undefined);
    setFolded(next);

    if (next) {
      setEditing(undefined);
    }
  };

  /**
   * Where a folded conversation's name goes: beside its mark, or below it on a
   * narrow window, where there is no room beside anything.
   */
  const placeName = (name: string, mark: HTMLElement): NamedMark => {
    const box = mark.getBoundingClientRect();
    const wide = window.innerWidth >= 768;

    return {
      name,
      top: wide ? box.top + box.height / 2 : box.bottom + 8,
      left: wide ? box.right + 12 : box.left,
      centred: wide
    };
  };

  /** Closes whatever a row was doing, and puts the keyboard back on it. */
  const closeEditing = (id: string): void => {
    setEditing(undefined);
    setRefocus({ kind: 'row', id });
  };

  /**
   * Where the keyboard goes when a row is gone: the conversation that took its
   * place in the list, or the one that was in front of it, or the control that
   * starts a new one.
   */
  const neighbourOf = (id: string): Refocus => {
    const list = conversations.data ?? [];
    const index = list.findIndex(conversation => conversation.id === id);
    const next = list[index + 1] ?? list[index - 1];

    return next === undefined ? { kind: 'new' } : { kind: 'row', id: next.id };
  };

  const start = async (): Promise<void> => {
    startConversation.reset();

    try {
      const conversation = await startConversation.mutateAsync({});
      await navigate(`/c/${conversation.id}`);
    } catch {
      // The failure is the mutation's own error, rendered above the list.
    }
  };

  const save = async (id: string, title: string): Promise<void> => {
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
      await rename.mutateAsync({ id, title: name });
    } catch {
      // The conversation keeps the name it had, and the error above the list is
      // what says the new one was not taken.
    }
  };

  const confirmDelete = async (id: string): Promise<void> => {
    rename.reset();
    remove.reset();
    setEditing(undefined);

    const wasOpen = openId === id;
    const next = neighbourOf(id);

    try {
      await remove.mutateAsync(id);

      if (wasOpen) {
        await navigate('/');
      }

      setRefocus(wasOpen ? { kind: 'new' } : next);
    } catch {
      // The conversation is still there, and the error above the list says why.
      setRefocus({ kind: 'row', id });
    }
  };

  const failure =
    startConversation.error ?? rename.error ?? remove.error ?? undefined;

  // The conversation a row's control is asking about. The question is asked in a
  // dialog over the list rather than in the row, so the row goes on being a row
  // and what the question is about is this.
  const asking =
    editing === undefined
      ? undefined
      : conversations.data?.find(candidate => candidate.id === editing.id);

  /** The conversations, as the sidebar's body and as the panel the rail opens. */
  const listing = (
    <nav
      id="conversations"
      aria-label="Conversations"
      className="min-h-0 flex-1 overflow-y-auto px-2 pt-2 pb-3">
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
            <div className={rowClass(openId === conversation.id)}>
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
                  setEditing({ kind: 'rename', id: conversation.id })
                }
                className={ROW_ACTION_CLASS}>
                <PencilIcon />
              </button>
              <button
                type="button"
                aria-label={`Delete ${conversationTitle(conversation)}`}
                onClick={() =>
                  setEditing({ kind: 'deleting', id: conversation.id })
                }
                className={ROW_ACTION_CLASS}>
                <TrashIcon />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <aside
      className={`flex max-h-64 shrink-0 flex-col overflow-hidden border-b border-neutral-800 bg-neutral-900 transition-[width] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none md:h-screen md:max-h-none md:border-b-0 md:border-r ${
        folded ? 'duration-200 md:w-16' : 'duration-300 md:w-72'
      }`}>
      {editing?.kind === 'rename' && asking !== undefined ? (
        <RenameDialog
          name={conversationTitle(asking)}
          onSave={name => void save(asking.id, name)}
          onCancel={() => closeEditing(asking.id)}
        />
      ) : null}
      {editing?.kind === 'deleting' && asking !== undefined ? (
        <DeleteDialog
          title={conversationTitle(asking)}
          onConfirm={() => void confirmDelete(asking.id)}
          onCancel={() => closeEditing(asking.id)}
        />
      ) : null}
      {withHeader ? (
        <div
          className={`flex items-center gap-2 p-4 ${
            folded ? 'md:flex-col md:items-start' : ''
          }`}>
          <button
            type="button"
            aria-expanded={!folded}
            aria-controls="conversations conversations-rail"
            aria-label={
              folded ? 'Show the conversations' : 'Hide the conversations'
            }
            className={FOLD_CLASS}
            onClick={() => fold(!folded)}>
            {folded ? <PanelOpenIcon /> : <PanelFoldIcon />}
          </button>
          <Link
            to="/"
            className={`${BRAND_CLASS} flex-1 ${folded ? 'md:hidden' : ''}`}>
            Yu-Gi-Oh Assistant
          </Link>
          {folded ? (
            <Link
              to="/"
              aria-label="Yu-Gi-Oh Assistant"
              className={`hidden md:block md:px-2 ${BRAND_CLASS}`}>
              <MonogramIcon />
            </Link>
          ) : null}
          <button
            type="button"
            ref={newConversation}
            className={`${START_CLASS} ${folded ? 'md:px-2' : ''}`}
            aria-label="New conversation"
            onClick={() => void start()}
            disabled={startConversation.isPending}>
            <PlusIcon />
            <span className={folded ? 'md:hidden' : ''}>New</span>
          </button>
        </div>
      ) : null}

      {failure === undefined ? null : (
        <p role="alert" className="px-4 pb-2 text-sm text-red-400">
          {failure.message}
        </p>
      )}

      {folded ? (
        <nav
          id="conversations-rail"
          aria-label="Conversations"
          className={RAIL_CLASS}>
          {(conversations.data ?? []).map(conversation => {
            const open = openId === conversation.id;
            const name = conversationTitle(conversation);

            return (
              <Link
                key={conversation.id}
                to={`/c/${conversation.id}`}
                aria-label={name}
                aria-current={open ? 'page' : undefined}
                onMouseEnter={event =>
                  setNamed(placeName(name, event.currentTarget))
                }
                onMouseLeave={() => setNamed(undefined)}
                onFocus={event =>
                  setNamed(placeName(name, event.currentTarget))
                }
                onBlur={() => setNamed(undefined)}
                className={`${MARK_CLASS(open)} md:mx-auto`}>
                {name.trim().charAt(0).toLocaleUpperCase() || '?'}
              </Link>
            );
          })}
        </nav>
      ) : (
        listing
      )}

      {named === undefined ? null : (
        <span
          aria-hidden="true"
          style={{ top: named.top, left: named.left }}
          className={`pointer-events-none fixed z-40 max-w-[16rem] rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 ${
            named.centred ? '-translate-y-1/2' : ''
          }`}>
          {named.name}
        </span>
      )}
    </aside>
  );
}

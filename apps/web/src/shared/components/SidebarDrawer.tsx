import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { useStartConversation } from '../conversationQueries.js';
import Sidebar from './Sidebar.js';
import PanelFoldIcon from './icons/PanelFoldIcon.js';
import PanelOpenIcon from './icons/PanelOpenIcon.js';
import PlusIcon from './icons/PlusIcon.js';

/**
 * The sidebar on a window too narrow to keep it beside the chat. It stands over
 * the chat instead: a bar keeps the way in, and pressing its mark brings the
 * whole sidebar across the room with the chat dimmed behind it.
 *
 * The bar is what a phone keeps of the header, so it carries the same three
 * things the header does (the way in, the name, and the way to start a
 * conversation), and the sidebar it opens holds no header of its own below the
 * breakpoint. The drawer arrives from the edge it lives on and leaves the same
 * way, the room behind it dims, and the keyboard is put on the drawer as it opens
 * and back on the mark as it closes.
 */
export default function SidebarDrawer() {
  const [open, setOpen] = useState(false);
  const start = useStartConversation();
  const navigate = useNavigate();
  const location = useLocation();
  const drawer = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLButtonElement>(null);

  const begin = async (): Promise<void> => {
    start.reset();

    try {
      const conversation = await start.mutateAsync({});
      await navigate(`/c/${conversation.id}`);
    } catch {
      // The failure is the mutation's own, and the sidebar it opened shows it.
    }
  };

  // The drawer takes the keyboard, and gives it back to the mark: a control that
  // opened something is where the player looks for it again.
  useEffect(() => {
    if (open) {
      drawer.current?.focus();
      return;
    }

    mark.current?.focus();
  }, [open]);

  // Choosing a conversation closes the list it was chosen from, and so does
  // starting one: what the drawer is for has been answered, and the chat behind it
  // is what the player wants next. It is watching where they went rather than
  // which control was pressed, so every way out of the list behaves the same.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <>
      <div className="flex items-center gap-1 border-b border-neutral-800 bg-neutral-900 p-3 md:hidden">
        <button
          type="button"
          ref={mark}
          aria-expanded={open}
          aria-controls="sidebar-drawer"
          aria-label="Show the conversations"
          onClick={() => setOpen(value => !value)}
          className="inline-flex shrink-0 items-center justify-center rounded p-2 text-neutral-400 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
          <PanelOpenIcon />
        </button>
        <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-semibold tracking-wide">
          <span className="truncate">Yu-Gi-Oh Assistant</span>
        </span>
        <button
          type="button"
          aria-label="New conversation"
          onClick={() => void begin()}
          disabled={start.isPending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded bg-amber-500 px-2.5 py-1.5 text-sm font-medium whitespace-nowrap text-amber-950 hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:opacity-60">
          <PlusIcon />
          New
        </button>
      </div>

      {open ? (
        <button
          type="button"
          aria-label="Close the conversations"
          onClick={() => setOpen(false)}
          tabIndex={-1}
          className="fixed inset-0 z-20 bg-neutral-950/70 transition-opacity duration-150 motion-reduce:transition-none md:hidden"
        />
      ) : null}

      <div
        ref={drawer}
        id="sidebar-drawer"
        tabIndex={-1}
        inert={!open}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col max-md:[&>aside]:min-h-0 max-md:[&>aside]:flex-1 max-md:[&>aside]:max-h-none max-md:[&>aside]:w-full outline-none transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="flex shrink-0 items-center border-b border-neutral-800 bg-neutral-900 p-3">
          <button
            type="button"
            aria-label="Hide the conversations"
            onClick={() => setOpen(false)}
            className="inline-flex shrink-0 items-center justify-center rounded p-2 text-neutral-400 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
            <PanelFoldIcon />
          </button>
        </div>
        <Sidebar withHeader={false} />
      </div>
    </>
  );
}

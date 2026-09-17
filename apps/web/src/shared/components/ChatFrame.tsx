import { type MouseEvent } from 'react';
import { Outlet, useMatch } from 'react-router';

import { useWideViewport } from '../useWideViewport.js';
import Sidebar from './Sidebar.js';
import SidebarDrawer from './SidebarDrawer.js';

const SKIP_CLASS =
  'sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded focus:bg-neutral-900 focus:px-3 focus:py-2 focus:text-sm focus:text-neutral-100 focus:outline-2 focus:outline-offset-2 focus:outline-amber-300';

/**
 * The chat's frame: the conversations beside the one that is open. It stacks on
 * a narrow window rather than letting the sidebar sit over the chat.
 *
 * The conversation list is as long as the player's history, and every row
 * carries its own controls, so reaching the conversation by keyboard would
 * otherwise cost a stop per conversation. The skip is the first thing focus
 * finds on a conversation address, and it lands on the request when there is one
 * and on the conversation otherwise.
 */
export default function ChatFrame() {
  const open = useMatch('/c/:conversationId') !== null;
  const wide = useWideViewport();

  // The frame is one screen tall at every size and its regions scroll inside it.
  // Left as `min-h-screen`, the document itself scrolls, and on a narrow window
  // the bar is dragged off the top the moment the prompt takes the keyboard: the
  // sidebar stops behaving like a sidebar.
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-neutral-950 text-neutral-100 md:flex-row">
      {open ? (
        <a
          href="#conversation"
          className={SKIP_CLASS}
          onClick={(event: MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            // The request when the conversation has one to offer, and the
            // conversation itself when it is loading, gone, or unreadable: the
            // link is offered on all of those, so it has to land on all of them.
            const target =
              document.getElementById('prompt') ??
              document.getElementById('conversation');

            target?.focus();
          }}>
          Skip to the conversation
        </a>
      ) : null}
      {wide ? <Sidebar /> : <SidebarDrawer />}
      <main
        id="conversation"
        tabIndex={-1}
        className="flex min-h-0 min-w-0 flex-1 flex-col focus:outline-none">
        <Outlet />
      </main>
    </div>
  );
}

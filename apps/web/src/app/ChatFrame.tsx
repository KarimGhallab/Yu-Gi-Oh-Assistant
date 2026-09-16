import { type MouseEvent } from 'react';
import { Outlet, useMatch } from 'react-router';

import Sidebar from './Sidebar.js';

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

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100 md:flex-row">
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
      <Sidebar />
      <main
        id="conversation"
        tabIndex={-1}
        className="flex min-w-0 flex-1 flex-col focus:outline-none">
        <Outlet />
      </main>
    </div>
  );
}

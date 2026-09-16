import { Link, NavLink, useNavigate } from 'react-router';

import { conversationTitle } from './conversationTitle.js';
import { useConversations, useStartConversation } from './queries.js';

const BRAND_CLASS =
  'min-w-0 truncate rounded text-sm font-semibold tracking-wide text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400';

const START_CLASS =
  'shrink-0 rounded bg-amber-500 px-2.5 py-1.5 text-sm font-medium whitespace-nowrap text-amber-950 hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:opacity-60';

const conversationLinkClass = ({ isActive }: { isActive: boolean }): string =>
  `block truncate rounded px-2 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
    isActive
      ? 'bg-neutral-800 text-neutral-100'
      : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-100'
  }`;

/**
 * The conversations that can be reopened, and the control that starts one. Which
 * conversation is open is the address's business, so the link that is marked is
 * the one the address names.
 */
export default function Sidebar() {
  const conversations = useConversations();
  const startConversation = useStartConversation();
  const navigate = useNavigate();

  const start = async (): Promise<void> => {
    try {
      const conversation = await startConversation.mutateAsync();
      await navigate(`/c/${conversation.id}`);
    } catch {
      // The failure is the mutation's own error, rendered beside the control.
    }
  };

  return (
    <aside className="flex max-h-64 shrink-0 flex-col border-b border-neutral-800 bg-neutral-900 md:h-screen md:max-h-none md:w-72 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between gap-3 p-4">
        <Link to="/" className={BRAND_CLASS}>
          Yu-Gi-Oh Assistant
        </Link>
        <button
          type="button"
          className={START_CLASS}
          aria-label="New conversation"
          onClick={() => void start()}
          disabled={startConversation.isPending}>
          New
        </button>
      </div>

      {startConversation.isError ? (
        <p role="alert" className="px-4 pb-2 text-sm text-red-400">
          {startConversation.error.message}
        </p>
      ) : null}

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
            <li key={conversation.id}>
              <NavLink
                to={`/c/${conversation.id}`}
                className={conversationLinkClass}>
                {conversationTitle(conversation)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

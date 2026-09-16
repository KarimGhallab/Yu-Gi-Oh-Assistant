import { Outlet } from 'react-router';

import Sidebar from './Sidebar.js';

/**
 * The chat's frame: the conversations beside the one that is open. It stacks on
 * a narrow window rather than letting the sidebar sit over the chat.
 */
export default function ChatFrame() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100 md:flex-row">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}

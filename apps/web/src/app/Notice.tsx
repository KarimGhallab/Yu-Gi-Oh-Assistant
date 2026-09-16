import type { ReactNode } from 'react';

/**
 * The link and button styling the notices share, so an action looks the same
 * wherever a surface has to offer one.
 */
export const ACTION_CLASS =
  'inline-block rounded bg-amber-500 px-3 py-1.5 text-sm font-medium text-neutral-950 hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';

interface NoticeProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

/**
 * A panel that stands in for content a surface cannot show: what happened, and
 * what the player can do about it. It is the page while it is on screen, so its
 * title is the page's heading.
 */
export default function Notice({ title, children, action }: NoticeProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-lg font-semibold text-neutral-100">{title}</h1>
      <div className="max-w-md text-sm text-neutral-400">{children}</div>
      {action === undefined ? null : <div className="mt-1">{action}</div>}
    </div>
  );
}

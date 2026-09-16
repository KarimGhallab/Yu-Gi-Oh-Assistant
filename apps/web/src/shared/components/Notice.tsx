import type { ReactNode } from 'react';

/**
 * The link and button styling the notices share, so an action looks the same
 * wherever a surface has to offer one.
 */
export const ACTION_CLASS =
  'inline-block rounded bg-amber-500 px-3 py-1.5 text-sm font-medium text-amber-950 hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';

interface NoticeProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  /* Whether this notice is the page it is on. A notice that stands in for the
   * page keeps the page's own heading and the title scale; one that stands in
   * for content inside a page is below that page's heading, so it takes the
   * label scale instead. */
  headingLevel?: 1 | 2;
}

/**
 * A panel that stands in for content a surface cannot show: what happened, and
 * what the player can do about it. It is the page while it is on screen, so its
 * title is the page's heading.
 */
export default function Notice({
  title,
  children,
  action,
  headingLevel = 1
}: NoticeProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h1';

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <Heading
        className={
          headingLevel === 2
            ? 'text-sm font-medium text-neutral-100'
            : 'text-lg font-semibold text-neutral-100'
        }>
        {title}
      </Heading>
      <div className="max-w-md text-sm text-neutral-400">{children}</div>
      {action === undefined ? null : <div className="mt-1">{action}</div>}
    </div>
  );
}

import type { IconProps } from './IconProps.js';

/**
 * The panel with its contents coming out of it: the mark on the control that
 * brings the conversation list back. The pair to this is the panel folding, so
 * the mark says which way the list is about to go rather than only which control
 * was pressed.
 */
export default function PanelOpenIcon({ className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      viewBox="0 0 24 24"
      width="16">
      <rect height="16" rx="1" width="18" x="3" y="4" />
      <path d="M9 4v16" />
      <path d="M13.5 12H18M16 10l2 2-2 2" />
    </svg>
  );
}

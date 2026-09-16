import type { IconProps } from './IconProps.js';

/**
 * The panel with its contents going into it: the mark on the control that folds
 * the conversation list away. The pair to this is the panel opening, so the mark
 * says which way the list is about to go rather than only which control was
 * pressed.
 */
export default function PanelFoldIcon({ className }: IconProps) {
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
      <path d="M18 12h-4.5M15.5 10l-2 2 2 2" />
    </svg>
  );
}

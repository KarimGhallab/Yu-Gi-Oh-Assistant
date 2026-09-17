import type { IconProps } from './IconProps.js';

/**
 * The caret: the mark on a control that opens something under it. It is drawn
 * rather than borrowed from the platform so that it is the same mark on every
 * control that has one, and so that it can be turned over when what it opens is
 * open, which a background image cannot.
 */
export default function ChevronIcon({ className }: IconProps) {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

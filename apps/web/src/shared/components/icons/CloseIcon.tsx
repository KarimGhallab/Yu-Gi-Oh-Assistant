import type { IconProps } from './IconProps.js';

/**
 * The cross: the mark on the control that calls a filter change off without
 * making it. It is the plus turned on itself, so the two the editor shows
 * together are one mark and its opposite.
 */
export default function CloseIcon({ className }: IconProps) {
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
      <path d="M7 7l10 10M17 7L7 17" />
    </svg>
  );
}

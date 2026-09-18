import type { IconProps } from './IconProps.js';

/**
 * The bin: the mark on the control that deletes a conversation. It is the only
 * mark in the set for something that cannot be undone, so it stays a plain
 * outline: the confirmation, not the glyph, is what asks.
 */
export default function TrashIcon({ className }: IconProps) {
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
      <path d="M4 4h16" />
      <path d="M10 4V2h4v2" />
      <path d="M5.5 4v18h13V4" />
    </svg>
  );
}

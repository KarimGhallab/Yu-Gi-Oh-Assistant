import type { IconProps } from './IconProps.js';

/**
 * One more of something: the mark on the control that starts a conversation.
 */
export default function PlusIcon({ className }: IconProps) {
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
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

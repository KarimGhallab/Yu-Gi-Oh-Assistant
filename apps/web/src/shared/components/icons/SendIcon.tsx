import type { IconProps } from './IconProps.js';

/**
 * The arrow: the mark on the control that sends a request. It points up rather
 * than sideways because the request goes into the conversation above it.
 */
export default function SendIcon({ className }: IconProps) {
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
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

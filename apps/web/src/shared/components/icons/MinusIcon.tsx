import type { IconProps } from './IconProps.js';

/**
 * The bar: the mark on the control that takes one filter away. It is the plus's
 * own horizontal stroke and nothing more, so adding and taking away are one
 * drawing with one line between them.
 */
export default function MinusIcon({ className }: IconProps) {
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
      <path d="M5 12h14" />
    </svg>
  );
}

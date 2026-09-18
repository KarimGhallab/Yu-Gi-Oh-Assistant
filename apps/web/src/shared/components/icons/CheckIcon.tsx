import type { IconProps } from './IconProps.js';

/**
 * The tick: the mark on the control that saves a filter being corrected, or adds
 * the one being said.
 */
export default function CheckIcon({ className }: IconProps) {
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
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

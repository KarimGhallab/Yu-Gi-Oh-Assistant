import type { IconProps } from './IconProps.js';

/**
 * The monogram: the brand where there is only room for a mark. It is the letter
 * drawn the way the rest of the set is drawn rather than set in the platform's
 * type, so a folded sidebar and a phone's bar carry the same thing, and it is
 * named for what it stands for wherever it is the whole of a control.
 */
export default function MonogramIcon({ className }: IconProps) {
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
      strokeWidth="2.5"
      viewBox="0 0 24 24"
      width="16">
      <path d="M5 4l7 8 7-8M12 12v8" />
    </svg>
  );
}

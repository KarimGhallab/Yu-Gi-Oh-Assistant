/**
 * What every icon in the set takes: the class that places it, and nothing else.
 * The size, the stroke, and the drawing box are the set's business rather than
 * the caller's, and the color is `currentColor`, so an icon takes the color of
 * the control it sits in and can never introduce one of its own.
 */
export interface IconProps {
  className?: string;
}

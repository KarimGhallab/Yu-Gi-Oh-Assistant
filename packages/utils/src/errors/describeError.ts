/**
 * Reads a message out of whatever was thrown. An `Error`, or anything else
 * carrying a string `message`, describes itself; everything else falls back to
 * its string form, so a thrown non-error still produces something readable.
 */
export function describeError(error: unknown): string {
  return hasMessage(error) ? error.message : String(error);
}

const hasMessage = (error: unknown): error is { message: string } =>
  error instanceof Error ||
  (typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string');

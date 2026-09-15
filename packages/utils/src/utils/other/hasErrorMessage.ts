export const hasErrorMessage = (
  error: unknown
): error is { message: string } => {
  if (error instanceof Error) {
    return true;
  }
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    error.message === 'string'
  ) {
    return true;
  }
  return false;
};

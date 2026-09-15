/**
 * Throws an error indicating that a check is not exhaustive.
 *
 * @param value - The value that caused the exhaust error.
 * @returns This function never returns a value.
 * @throws {Error} - Always throws an error with the message 'Check is not exhaustive!'.
 */
export const exhaust = (value: never): never => {
  throw new Error(`Check for ${value} is not exhaustive!`);
};

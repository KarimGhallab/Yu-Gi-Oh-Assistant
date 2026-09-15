const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(
  /\/+$/,
  ''
);

/**
 * Resolves an API path against the configured base URL.
 * Set `VITE_API_BASE_URL` at build time when the client is hosted separately.
 */
export const apiUrl = (path: string): string => `${API_BASE_URL}${path}`;

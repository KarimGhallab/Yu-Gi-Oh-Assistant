/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the API. Empty or unset means same-origin requests.
   */
  readonly VITE_API_BASE_URL?: string;
}

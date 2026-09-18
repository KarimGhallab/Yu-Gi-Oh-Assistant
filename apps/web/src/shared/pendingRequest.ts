/**
 * The request a surface hands to a conversation that does not exist yet. It
 * travels in the router's own state, which lives in memory: the address it was
 * handed to carries it for exactly as long as that navigation lasts, and a
 * reload of that address has no request to make. That is what keeps a first
 * request from being asked twice.
 */
export const pendingRequestState = (request: string): { request: string } => ({
  request
});

/**
 * The request a location is carrying, if it is carrying one. Nothing else in the
 * app puts state on a conversation address, so anything that is not a request is
 * read as none.
 */
export const pendingRequest = (state: unknown): string | undefined => {
  if (typeof state !== 'object' || state === null || !('request' in state)) {
    return undefined;
  }

  return typeof state.request === 'string' ? state.request : undefined;
};

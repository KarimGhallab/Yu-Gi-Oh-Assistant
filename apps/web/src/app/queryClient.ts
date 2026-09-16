import { QueryClient } from '@tanstack/react-query';

import { ApiError, ApiFailureKind } from '../api/client.js';

const UNREACHABLE_ATTEMPTS = 3;

/**
 * Whether to ask the server again after a query failed. A server that answered,
 * even to refuse, is not going to answer differently, so only a server the
 * client could not reach at all is worth asking again; anything else would keep
 * the player waiting on an answer that has already arrived.
 */
export const shouldRetryQuery = (failureCount: number, error: Error): boolean =>
  error instanceof ApiError &&
  error.kind === ApiFailureKind.Unreachable &&
  failureCount < UNREACHABLE_ATTEMPTS;

/**
 * The client the app runs on. Queries run whatever the browser believes about
 * the network, because the server is on this machine whether or not anything
 * else is reachable.
 */
export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetryQuery,
        networkMode: 'always'
      }
    }
  });

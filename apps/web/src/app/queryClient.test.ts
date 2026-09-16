import { describe, expect, it } from 'vitest';

import { ApiError, ApiFailureKind } from '../api/client.js';
import { createQueryClient, shouldRetryQuery } from './queryClient.js';

describe('the query client', () => {
  it('asks again only when it could not reach the server at all', () => {
    expect(
      shouldRetryQuery(0, new ApiError(ApiFailureKind.Unreachable, 'offline'))
    ).toBe(true);
    expect(
      shouldRetryQuery(
        0,
        new ApiError(ApiFailureKind.Refused, 'busy', { status: 503 })
      )
    ).toBe(false);
    expect(
      shouldRetryQuery(0, new ApiError(ApiFailureKind.Malformed, 'unreadable'))
    ).toBe(false);
    expect(shouldRetryQuery(0, new Error('something else'))).toBe(false);
  });

  it('stops asking after the attempts it allows', () => {
    const offline = new ApiError(ApiFailureKind.Unreachable, 'offline');

    expect(shouldRetryQuery(2, offline)).toBe(true);
    expect(shouldRetryQuery(3, offline)).toBe(false);
  });

  it('runs queries whatever the browser believes about the network', () => {
    expect(createQueryClient().getDefaultOptions().queries?.networkMode).toBe(
      'always'
    );
  });
});

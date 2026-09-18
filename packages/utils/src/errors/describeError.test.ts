import { describe, expect, it } from 'vitest';

import { describeError } from './describeError.js';

describe('describeError', () => {
  it('reads the message of an Error', () => {
    expect(describeError(new Error('boom'))).toBe('boom');
  });

  it('reads the message of a thrown object that carries one', () => {
    expect(describeError({ message: 'boom' })).toBe('boom');
  });

  it('falls back to the string form of anything else', () => {
    expect(describeError('boom')).toBe('boom');
    expect(describeError(7)).toBe('7');
    expect(describeError({})).toBe('[object Object]');
  });

  it('does not mistake a non-string message for one', () => {
    expect(describeError({ message: 7 })).toBe('[object Object]');
  });
});

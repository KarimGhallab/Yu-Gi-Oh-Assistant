import { describe, expect, it } from 'vitest';

import {
  TurnEventName,
  conversationSchema,
  turnEventSchema
} from '@ygo-assistant/contracts';

const conversation = {
  id: 1,
  title: 'A banish deck',
  language: 'en',
  model: 'llama3.1:8b',
  createdAt: '2026-09-16T10:00:00.000Z',
  updatedAt: '2026-09-16T10:00:00.000Z'
};

describe('the contracts package', () => {
  it('reads a conversation the server would send', () => {
    expect(conversationSchema.parse(conversation)).toEqual(conversation);
  });

  it('refuses a conversation the client could not render', () => {
    expect(
      conversationSchema.safeParse({ ...conversation, id: 0 }).success
    ).toBe(false);
  });

  it('reads a streamed frame as the event it names', () => {
    const frame = turnEventSchema.parse({
      type: TurnEventName.TurnEnd,
      messageId: 7
    });

    expect(frame.type).toBe(TurnEventName.TurnEnd);
  });
});

import type { Conversation } from '@ygo-assistant/contracts';

/**
 * What a conversation is called before it has been spoken in. A conversation is
 * named by its first message, so one that was just started has no title yet.
 */
const UNTITLED_CONVERSATION = 'New conversation';

export const conversationTitle = (conversation: Conversation): string =>
  conversation.title ?? UNTITLED_CONVERSATION;

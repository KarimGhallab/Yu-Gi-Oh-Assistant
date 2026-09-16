import { type Message, MessageRole } from '@ygo-assistant/contracts';

import CardGrid from './CardGrid.js';

const PLAYER = 'You';
const ASSISTANT = 'Assistant';

const CONTENT_CLASS = 'max-w-[68ch] whitespace-pre-wrap text-sm';

interface MessageHistoryProps {
  messages: Message[];
}

/**
 * What was said in a conversation, in the order it was said. The player's
 * request and the assistant's answer are told apart by their own label, and the
 * answer keeps its line breaks so a list does not collapse into one paragraph.
 * Prose is held to a readable measure while the cards below it take the width.
 */
export default function MessageHistory({ messages }: MessageHistoryProps) {
  return (
    <ol className="flex flex-col gap-6">
      {messages.map(message => (
        <MessageTurn key={message.id} message={message} />
      ))}
    </ol>
  );
}

interface MessageTurnProps {
  message: Message;
}

function MessageTurn({ message }: MessageTurnProps) {
  const fromPlayer = message.role === MessageRole.User;
  const cards = message.cards ?? [];

  return (
    <li className="flex flex-col gap-1">
      <p className="text-sm font-medium text-neutral-400">
        {fromPlayer ? PLAYER : ASSISTANT}
      </p>
      <p
        className={`${CONTENT_CLASS} ${
          fromPlayer ? 'text-neutral-400' : 'text-neutral-100'
        }`}>
        {message.content}
      </p>
      {cards.length === 0 ? null : <CardGrid cards={cards} />}
    </li>
  );
}

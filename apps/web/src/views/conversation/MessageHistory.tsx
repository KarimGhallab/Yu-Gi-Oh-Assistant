import { MessageRole } from '@ygo-assistant/contracts';

import CardGrid, { type SuggestedCard } from './CardGrid.js';

const PLAYER = 'You';
const ASSISTANT = 'Assistant';

const CONTENT_CLASS = 'max-w-[68ch] whitespace-pre-wrap text-sm';

/**
 * A turn as the history renders it. A stored turn and one that is still being
 * built are the same thing here, so the answer being written and the cards it
 * has reported so far go through the renderer the stored turn uses.
 */
export interface ChatTurn {
  key: string;
  role: MessageRole;
  content: string;
  cards?: SuggestedCard[];
  /*
   * The answer as it arrived, piece by piece, for a turn the server has not
   * stored yet. Each piece is its own node in a polite live region, so what is
   * announced is the piece that just arrived rather than the whole answer being
   * read out again on every piece; a stored turn has no pieces and is read as
   * the one text it is.
   */
  pieces?: string[];
}

interface MessageHistoryProps {
  messages: ChatTurn[];
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
        <MessageTurn key={message.key} message={message} />
      ))}
    </ol>
  );
}

interface MessageTurnProps {
  message: ChatTurn;
}

function MessageTurn({ message }: MessageTurnProps) {
  const fromPlayer = message.role === MessageRole.User;
  const cards = message.cards ?? [];
  const prose = `${CONTENT_CLASS} ${
    fromPlayer ? 'text-neutral-400' : 'text-neutral-100'
  }`;

  return (
    <li className="flex flex-col gap-1">
      <p className="text-sm font-medium text-neutral-400">
        {fromPlayer ? PLAYER : ASSISTANT}
      </p>
      {message.pieces === undefined ? (
        <p className={prose}>{message.content}</p>
      ) : (
        <div role="log" aria-label="The answer being written">
          <p className={prose}>
            {message.pieces.map((piece, index) => (
              <span key={index}>{piece}</span>
            ))}
          </p>
        </div>
      )}
      {cards.length === 0 ? null : <CardGrid cards={cards} />}
    </li>
  );
}

import { type Language, MessageRole } from '@ygo-assistant/contracts';

import CardGrid, { type SuggestedCard } from './CardGrid.js';

const PLAYER = 'You';
const ASSISTANT = 'Assistant';

const CONTENT_CLASS = 'whitespace-pre-wrap text-sm';
/*
 * The words a search ran on, in the readout's mono. It is taken out of the flow
 * until the request is pointed at, which is the only thing that shows it, and
 * it stays in the page while it is out of the way so a reader that cannot point
 * at it is told it with the request rather than never. sr-only is what its
 * absence from the layout costs: the two lines are there for the pointer, and
 * they move what follows them when they arrive.
 */
const SEARCHED_AS_CLASS =
  'sr-only group-hover:not-sr-only flex flex-col gap-1 font-mono text-xs';
const SEARCHED_AS_LABEL_CLASS = 'text-neutral-500';
const SEARCHED_AS_QUERY_CLASS = 'whitespace-pre-wrap text-neutral-400';

/**
 * A turn as the history renders it. A stored turn and one that is still being
 * built are the same thing here, so the answer being written and the cards it
 * has reported so far go through the renderer the stored turn uses. A request
 * carries the free text its turn searched on, when that was not the player's
 * own words.
 */
export interface ChatTurn {
  key: string;
  role: MessageRole;
  content: string;
  cards?: SuggestedCard[];
  query?: string;
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
  language: Language;
}

/**
 * What was said in a conversation, in the order it was said. The player's
 * request and the assistant's answer are told apart by their own label, and the
 * answer keeps its line breaks so a list does not collapse into one paragraph.
 * Prose is held to a readable measure while the cards below it take the width.
 * The conversation's language comes down to the cards, because a card the
 * language has no printing of has to say which language it is in.
 */
export default function MessageHistory({
  messages,
  language
}: MessageHistoryProps) {
  return (
    <ol className="flex flex-col gap-6">
      {messages.map(message => (
        <MessageTurn key={message.key} message={message} language={language} />
      ))}
    </ol>
  );
}

interface MessageTurnProps {
  message: ChatTurn;
  language: Language;
}

function MessageTurn({ message, language }: MessageTurnProps) {
  const fromPlayer = message.role === MessageRole.User;
  const cards = message.cards ?? [];
  const prose = `${CONTENT_CLASS} ${
    fromPlayer ? 'text-neutral-400' : 'text-neutral-100'
  }`;

  return (
    /*
     * The whole turn is the thing to point at, its name included: the words a
     * search ran on belong to the request the name introduces, and asking the
     * reader to hit the request's own line and nothing else is a smaller target
     * than the turn they are looking at.
     */
    <li className="group flex flex-col gap-1">
      <p className="text-sm font-medium text-neutral-400">
        {fromPlayer ? PLAYER : ASSISTANT}
      </p>
      {message.pieces === undefined ? (
        <div className="relative flex flex-col gap-1">
          <p className={prose}>{message.content}</p>
          {message.query === undefined ? null : (
            <SearchedAs query={message.query} />
          )}
        </div>
      ) : (
        <div role="log" aria-label="The answer being written">
          <p className={prose}>
            {message.pieces.map((piece, index) => (
              <span key={index}>{piece}</span>
            ))}
          </p>
        </div>
      )}
      {cards.length === 0 ? null : (
        <CardGrid cards={cards} language={language} />
      )}
    </li>
  );
}

interface SearchedAsProps {
  query: string;
}

/**
 * The free text a request was rewritten into for its search. Pointing at the
 * request is the only thing that shows it: there is no control to press and
 * nothing that stays once the pointer leaves. What a search ran on is still
 * worth reading before deciding whether it understood the request, so it is in
 * the page whether or not it is in front of you.
 */
function SearchedAs({ query }: SearchedAsProps) {
  return (
    <div className={SEARCHED_AS_CLASS}>
      <p className={SEARCHED_AS_LABEL_CLASS}>Searched as</p>
      <p className={SEARCHED_AS_QUERY_CLASS}>{query}</p>
    </div>
  );
}

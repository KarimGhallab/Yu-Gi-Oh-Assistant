import {
  type CardFilters,
  type Language,
  MessageRole,
  type SearchInterpretation
} from '@ygo-assistant/contracts';

import MessageProse from '../../shared/components/MessageProse.js';

import CardGrid, { type SuggestedCard } from './CardGrid.js';
import { describeFilter } from './describeFilter.js';

const PLAYER = 'You';
const ASSISTANT = 'Assistant';

/*
 * The player's own words, shown as they typed them. Only the answer is
 * Markdown: a request is read back rather than rendered, so a character the
 * player typed is a character they see.
 */
const REQUEST_CLASS = 'whitespace-pre-wrap text-sm text-neutral-400';
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
/*
 * The one action a request that was never answered carries. It takes the
 * prose's own link treatment, because asking again is the same kind of act as
 * following a card's source: a quiet word on the page, not a second lamp.
 */
const RETRY_CLASS =
  'rounded text-sm font-medium text-neutral-100 underline decoration-neutral-800 underline-offset-2 hover:decoration-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';
/*
 * The filters a search ran with, under an answer that found nothing. It is the
 * readout's own vocabulary, set in mono, but read rather than reached: the
 * controls for removing a filter are the readout's, and this is the record of
 * what the search was.
 */
const SEARCHED_WITH_CLASS =
  'flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-xs';
const SEARCHED_WITH_LABEL_CLASS = 'text-neutral-500';
const SEARCHED_WITH_LIST_CLASS =
  'flex flex-wrap items-baseline gap-x-4 gap-y-1';
const SEARCHED_WITH_FIELD_CLASS = 'text-neutral-500';
const SEARCHED_WITH_SAYS_CLASS = 'text-neutral-400';

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
  search?: SearchInterpretation;
  /*
   * A request whose turn never produced a reply, with the search it ran with
   * when the turn reported one. A request without it was answered, or is the
   * answer being written.
   */
  retry?: { filters?: CardFilters };
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
  onRetry(text: string, filters?: CardFilters): void;
}

/**
 * What was said in a conversation, in the order it was said. The player's
 * request and the assistant's answer are told apart by their own label, and the
 * answer is rendered from the Markdown it was written in while the request is
 * shown as it was typed. The conversation's language comes down to the cards,
 * because a card the language has no printing of has to say which language it
 * is in.
 */
export default function MessageHistory({
  messages,
  language,
  onRetry
}: MessageHistoryProps) {
  return (
    <ol className="flex flex-col gap-6">
      {messages.map(message => (
        <MessageTurn
          key={message.key}
          message={message}
          language={language}
          onRetry={onRetry}
        />
      ))}
    </ol>
  );
}

interface MessageTurnProps {
  message: ChatTurn;
  language: Language;
  onRetry(text: string, filters?: CardFilters): void;
}

function MessageTurn({ message, language, onRetry }: MessageTurnProps) {
  const fromPlayer = message.role === MessageRole.User;
  const cards = message.cards ?? [];
  // A search is shown beside the answer only when the answer is a search that
  // found nothing and the search carried filters to name. The answer being
  // written shows it once it has something to say, so the line does not arrive
  // before the cards have been reported.
  const searchedWith =
    !fromPlayer &&
    message.cards !== undefined &&
    message.cards.length === 0 &&
    message.search !== undefined &&
    message.search.filters.length > 0 &&
    (message.pieces === undefined || message.pieces.length > 0)
      ? message.search
      : undefined;

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
          {fromPlayer ? (
            <p className={REQUEST_CLASS}>{message.content}</p>
          ) : (
            <MessageProse markdown={message.content} />
          )}
          {message.query === undefined ? null : (
            <SearchedAs query={message.query} />
          )}
        </div>
      ) : (
        /*
         * The answer while it is written: the prose for the eye, and the
         * announcement for the ear, drawn apart. What the eye reads is Markdown,
         * which changes shape as it fills in, so a live region redrawn with it
         * would read the whole answer out again on every piece. The hidden region
         * is the answer arriving, one node per piece, which is what a screen
         * reader hears; it is positioned so its absolute box stays inside the
         * region the messages scroll in rather than stretching the page.
         */
        <div className="relative flex flex-col gap-1">
          <MessageProse markdown={message.pieces.join('')} />
          <div
            role="log"
            aria-label="The answer being written"
            className="sr-only">
            {message.pieces.map((piece, index) => (
              <span key={index}>{piece}</span>
            ))}
          </div>
        </div>
      )}
      {searchedWith === undefined ? null : (
        <SearchedWith search={searchedWith} />
      )}
      {message.retry === undefined ? null : (
        <UnansweredRequest
          onRetry={() => onRetry(message.content, message.retry?.filters)}
        />
      )}
      {cards.length === 0 ? null : (
        <CardGrid cards={cards} language={language} />
      )}
    </li>
  );
}

interface UnansweredRequestProps {
  onRetry(): void;
}

/**
 * What a request whose turn never produced a reply says for itself: that it was
 * not answered, and the one action that asks it again. It is a line of the
 * conversation rather than a notice over it, because the request is what it is
 * about and the request is a row of the history.
 */
function UnansweredRequest({ onRetry }: UnansweredRequestProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="text-sm text-neutral-400">
        This request was never answered.
      </p>
      <button type="button" onClick={onRetry} className={RETRY_CLASS}>
        Ask it again
      </button>
    </div>
  );
}

interface SearchedWithProps {
  search: SearchInterpretation;
}

/**
 * The filters an answer that found nothing was searched with, in the readout's
 * own words: the field it constrains set quietly and what it asked of that field
 * beside it. It is a record rather than a control, which is why nothing here is
 * pressable: the controls that remove a filter are the readout's, below.
 */
function SearchedWith({ search }: SearchedWithProps) {
  return (
    <div className={SEARCHED_WITH_CLASS}>
      <p className={SEARCHED_WITH_LABEL_CLASS}>Searched with</p>
      <ul
        aria-label="Filters the search ran with"
        className={SEARCHED_WITH_LIST_CLASS}>
        {search.filters.map((filter, index) => {
          const { field, says } = describeFilter(filter);

          return (
            <li key={index}>
              <span className={SEARCHED_WITH_FIELD_CLASS}>{field}</span>{' '}
              <span className={SEARCHED_WITH_SAYS_CLASS}>{says}</span>
            </li>
          );
        })}
      </ul>
    </div>
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

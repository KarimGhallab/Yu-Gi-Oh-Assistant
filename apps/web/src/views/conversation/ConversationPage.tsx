import { Link, useParams } from 'react-router';

import {
  type ConversationWithMessages,
  Language,
  MessageRole
} from '@ygo-assistant/contracts';

import { ApiError, ApiFailureKind } from '../../shared/api/client.js';
import Notice, { ACTION_CLASS } from '../../shared/components/Notice.js';
import { conversationTitle } from '../../shared/conversationTitle.js';
import {
  useConversation,
  useUpdateConversation
} from '../../shared/queries.js';

import Composer from './Composer.js';
import ExamplePrompts from './ExamplePrompts.js';
import MessageHistory, { type ChatTurn } from './MessageHistory.js';
import { failureAnnouncement, runningAnnouncement } from './turnCopy.js';
import { type SearchInterpretation, useTurn } from './useTurn.js';

/**
 * The conversation the address names. An address that names none says so and
 * offers the way back to the conversations; anything else that went wrong says
 * what the server said, with the choice to ask again.
 *
 * Each conversation gets its own surface, so opening a different one in the
 * middle of a turn remounts this rather than carrying that turn into it.
 */
export default function ConversationPage() {
  const conversationId = useParams().conversationId ?? '';

  return (
    <ConversationSurface key={conversationId} conversationId={conversationId} />
  );
}

interface ConversationSurfaceProps {
  conversationId: string;
}

function ConversationSurface({ conversationId }: ConversationSurfaceProps) {
  const conversation = useConversation(conversationId);
  const update = useUpdateConversation();
  const { send, turn, isRunning, interpretation, correction, correct } =
    useTurn(conversationId);

  if (conversationId.length === 0) {
    return <MissingConversation message="The address names no conversation." />;
  }

  if (conversation.isPending) {
    return <Notice title="Opening the conversation">One moment.</Notice>;
  }

  if (conversation.isError) {
    const failure = conversation.error;

    if (
      failure instanceof ApiError &&
      failure.kind === ApiFailureKind.Refused &&
      failure.status === 404
    ) {
      return <MissingConversation message={failure.message} />;
    }

    return (
      <Notice
        title="The conversation could not be opened"
        action={
          <button
            type="button"
            className={ACTION_CLASS}
            onClick={() => void conversation.refetch()}>
            Try again
          </button>
        }>
        {failure.message}
      </Notice>
    );
  }

  // What is rendered is the conversation the server holds, followed by the turn
  // that is not stored yet: the question while it is still only on this screen,
  // and the answer as it is written. The question is dropped as soon as the
  // server's copy of it is in hand, whether that is the turn ending or a read of
  // the conversation that arrived while the turn was running.
  const stored = conversation.data.messages;
  const held = new Set(stored.map(message => message.id));
  const askingTwice =
    turn !== undefined &&
    turn.userMessageId !== undefined &&
    held.has(turn.userMessageId);

  const turns: ChatTurn[] = [
    ...stored.map(message => ({
      key: String(message.id),
      role: message.role,
      content: message.content,
      cards: message.cards
    })),
    ...(turn === undefined || turn.question.length === 0 || askingTwice
      ? []
      : [{ key: ASKING, role: MessageRole.User, content: turn.question }]),
    // The answer's turn stands from the moment the turn runs, before it has said
    // anything: that is what makes the region its pieces arrive in a live region
    // rather than one the screen reader meets already full.
    ...(turn === undefined || !turn.running
      ? []
      : [
          {
            key: ANSWERING,
            role: MessageRole.Assistant,
            content: turn.pieces.join(''),
            cards: turn.cards,
            pieces: turn.pieces
          }
        ])
  ];

  // The control shows what was asked for while the change is on its way, so a
  // switch does not look like it bounced back before it lands.
  const asked = update.isPending ? update.variables?.patch.language : undefined;
  const language = asked ?? conversation.data.language;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-col gap-1 border-b border-neutral-800 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="truncate text-lg font-semibold text-neutral-100">
            {conversationTitle(conversation.data)}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <label htmlFor="language" className="text-sm text-neutral-500">
              Cards in
            </label>
            <select
              id="language"
              value={language}
              onChange={event => {
                const chosen = LANGUAGES.find(
                  candidate => candidate.language === event.target.value
                );

                if (chosen !== undefined) {
                  update.mutate({
                    id: conversationId,
                    patch: { language: chosen.language }
                  });
                }
              }}
              className={LANGUAGE_CLASS}>
              {LANGUAGES.map(candidate => (
                <option key={candidate.language} value={candidate.language}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {update.error === null ? null : (
          <p role="alert" className="text-sm text-red-400">
            {update.error.message}
          </p>
        )}
      </header>
      <section
        aria-label="Messages"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
        {turns.length === 0 ? (
          <ExamplePrompts onChoose={text => void send(text, language)} />
        ) : (
          <MessageHistory messages={turns} />
        )}
      </section>
      <Composer
        onSend={text => void send(text, language)}
        running={isRunning}
        announcement={isRunning ? runningAnnouncement(turn?.status) : undefined}
        readout={
          correction === undefined
            ? (interpretation ?? lastSearch(conversation.data.messages))
            : { filters: correction }
        }
        onCorrect={correct}
        failure={
          turn?.failure === undefined
            ? undefined
            : failureAnnouncement(turn.failure)
        }
      />
    </div>
  );
}

interface MissingConversationProps {
  message: string;
}

/**
 * The keys of the two turns that are not stored: the question that is still only
 * on this screen, and the answer being written.
 */
const ASKING = 'asking';
const ANSWERING = 'answering';

/**
 * The languages a conversation can be in, each with the word the player reads
 * for it. The values are the domain's, so what the control sends is what the
 * search partitions the catalog by.
 */
const LANGUAGES: { language: Language; name: string }[] = [
  { language: Language.English, name: 'English' },
  { language: Language.French, name: 'French' }
];

/**
 * A setting of the conversation rather than of the request: quiet text with the
 * platform's own caret, because the header is not the bench, and the two amber
 * fills a conversation already carries are the limit.
 */
const LANGUAGE_CLASS =
  'rounded bg-transparent pr-1 text-sm text-neutral-400 hover:text-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300';

/**
 * What the last stored search was understood as. A reply a turn stored keeps the
 * filters it ran with and nothing about how it came by them, so a conversation
 * opened again shows what it searched and says nothing about why a search
 * carried no filters at all.
 */
function lastSearch(
  messages: ConversationWithMessages['messages']
): SearchInterpretation | undefined {
  const searched = messages.findLast(message => message.filters !== undefined);

  return searched?.filters === undefined
    ? undefined
    : { filters: searched.filters };
}

function MissingConversation({ message }: MissingConversationProps) {
  return (
    <Notice
      title="That conversation does not exist"
      action={
        <Link to="/" className={ACTION_CLASS}>
          Back to the conversations
        </Link>
      }>
      {message}
    </Notice>
  );
}

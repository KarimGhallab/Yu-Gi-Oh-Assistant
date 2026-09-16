import { Link, useParams } from 'react-router';

import { MessageRole } from '@ygo-assistant/contracts';

import { ApiError, ApiFailureKind } from '../api/client.js';
import Composer from './Composer.js';
import ExamplePrompts from './ExamplePrompts.js';
import MessageHistory, { type ChatTurn } from './MessageHistory.js';
import Notice, { ACTION_CLASS } from './Notice.js';
import { conversationTitle } from './conversationTitle.js';
import { useConversation } from './queries.js';
import { failureAnnouncement, runningAnnouncement } from './turnCopy.js';
import { useTurn } from './useTurn.js';

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
  const { send, turn, isRunning } = useTurn(conversationId);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-neutral-800 px-6 py-4">
        <h1 className="truncate text-lg font-semibold text-neutral-100">
          {conversationTitle(conversation.data)}
        </h1>
      </header>
      <section
        aria-label="Messages"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
        {turns.length === 0 ? (
          <ExamplePrompts onChoose={text => void send(text)} />
        ) : (
          <MessageHistory messages={turns} />
        )}
      </section>
      <Composer
        onSend={text => void send(text)}
        running={isRunning}
        announcement={isRunning ? runningAnnouncement(turn?.status) : undefined}
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

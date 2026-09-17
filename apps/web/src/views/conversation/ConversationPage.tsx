import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';

import {
  type ConversationWithMessages,
  Language,
  MessageRole
} from '@ygo-assistant/contracts';

import { ApiError, ApiFailureKind } from '../../shared/api/apiClient.js';
import Notice, { ACTION_CLASS } from '../../shared/components/Notice.js';
import {
  useConversation,
  useModels,
  useUpdateConversation
} from '../../shared/conversationQueries.js';
import { conversationTitle } from '../../shared/conversationTitle.js';
import { pendingRequest } from '../../shared/pendingRequest.js';

import Composer from './Composer.js';
import ExamplePrompts from './ExamplePrompts.js';
import MessageHistory, { type ChatTurn } from './MessageHistory.js';
import {
  failureAnnouncement,
  runningAnnouncement
} from './turnAnnouncements.js';
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
  const models = useModels();
  const { send, turn, isRunning, interpretation, correction, correct } =
    useTurn(conversationId);
  const location = useLocation();
  const navigate = useNavigate();
  const handedOver = useRef(false);

  // A request can arrive with the address: the empty state starts a conversation
  // and hands it what was typed there, because the field it was typed in is gone
  // by the time this surface exists. It is asked once, and the address is left
  // without it, so going back to it or reloading it asks for nothing.
  const request = pendingRequest(location.state);

  useEffect(() => {
    if (handedOver.current || request === undefined) {
      return;
    }

    handedOver.current = true;
    void navigate(location.pathname, { replace: true, state: null });
    void send(request);
  });

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
      key: message.id,
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

  // The controls show what was asked for while a change is on its way, so a
  // switch does not look like it bounced back before it lands.
  const asked = update.isPending ? update.variables?.patch : undefined;
  const language = asked?.language ?? conversation.data.language;
  const model = asked?.model ?? conversation.data.model;

  const changeLanguage = (next: Language): void => {
    update.mutate({ id: conversationId, patch: { language: next } });
  };

  const changeModel = (next: string): void => {
    update.mutate({ id: conversationId, patch: { model: next } });
  };

  const announcement = isRunning
    ? runningAnnouncement(turn?.status)
    : undefined;
  const failure =
    turn?.failure === undefined ? undefined : failureAnnouncement(turn.failure);
  const readout =
    correction === undefined
      ? (interpretation ?? lastSearch(conversation.data.messages))
      : { filters: correction };

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
          <ExamplePrompts
            onChoose={text => void send(text, { language, model })}
          />
        ) : (
          <MessageHistory messages={turns} language={language} />
        )}
      </section>
      <Composer
        onSend={text => void send(text, { language, model })}
        running={isRunning}
        announcement={announcement}
        readout={readout}
        onCorrect={correct}
        failure={failure}
        language={language}
        model={model}
        models={models.data}
        settingsError={update.error?.message}
        onLanguage={changeLanguage}
        onModel={changeModel}
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

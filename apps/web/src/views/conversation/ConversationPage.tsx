import { Link, useParams } from 'react-router';

import {
  type ConversationWithMessages,
  Language,
  MessageRole,
  type Model
} from '@ygo-assistant/contracts';

import { ApiError, ApiFailureKind } from '../../shared/api/client.js';
import Notice, { ACTION_CLASS } from '../../shared/components/Notice.js';
import { conversationTitle } from '../../shared/conversationTitle.js';
import {
  useConversation,
  useModels,
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
  const models = useModels();
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

  // The controls show what was asked for while a change is on its way, so a
  // switch does not look like it bounced back before it lands.
  const asked = update.isPending ? update.variables?.patch : undefined;
  const language = asked?.language ?? conversation.data.language;
  const model = asked?.model ?? conversation.data.model;
  // A conversation can be left on a model the machine no longer has, which is a
  // state the player should see rather than a control that shows nothing.
  const chosen = models.data?.find(candidate => candidate.name === model);
  const missing = models.data !== undefined && chosen === undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-col gap-1 border-b border-neutral-800 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
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
                const chosenLanguage = LANGUAGES.find(
                  candidate => candidate.language === event.target.value
                );

                if (chosenLanguage !== undefined) {
                  update.mutate({
                    id: conversationId,
                    patch: { language: chosenLanguage.language }
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
            <label htmlFor="model" className="text-sm text-neutral-500">
              Answered by
            </label>
            <select
              id="model"
              value={model}
              onChange={event =>
                update.mutate({
                  id: conversationId,
                  patch: { model: event.target.value }
                })
              }
              className={LANGUAGE_CLASS}>
              {missing ? <option value={model}>{model}</option> : null}
              {(models.data ?? []).map(candidate => (
                <option key={candidate.name} value={candidate.name}>
                  {candidate.name}
                  {limitation(candidate)}
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
        {missing ? (
          <p role="alert" className="text-sm text-red-400">
            {model} is not installed. Run ollama pull {model} to install it.
          </p>
        ) : null}
        {chosen !== undefined && !chosen.supportsCompletion ? (
          <p role="alert" className="text-sm text-red-400">
            {chosen.name} cannot answer a turn.
          </p>
        ) : null}
        {chosen?.supportsCompletion === true &&
        chosen.supportsStructuredOutput === false ? (
          <p className="text-sm text-neutral-500">
            {chosen.name} cannot produce structured filters, so a request is
            parsed from the prompt.
          </p>
        ) : null}
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
 * What a model's own option says about it. A model that cannot answer a turn at
 * all is named as such rather than as one that only answers without a schema,
 * because that is the fact that matters when it is chosen, and the listing
 * reports both.
 */
const limitation = (candidate: Model): string => {
  if (!candidate.supportsCompletion) {
    return ' (cannot answer)';
  }

  return candidate.supportsStructuredOutput ? '' : ' (no structured filters)';
};

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

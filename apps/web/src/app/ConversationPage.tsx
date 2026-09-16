import { Link, useParams } from 'react-router';

import { ApiError, ApiFailureKind } from '../api/client.js';
import Notice, { ACTION_CLASS } from './Notice.js';
import { conversationTitle } from './conversationTitle.js';
import { useConversation } from './queries.js';

/**
 * The conversation the address names. An address that names none says so and
 * offers the way back to the conversations; anything else that went wrong says
 * what the server said, with the choice to ask again.
 */
export default function ConversationPage() {
  const conversationId = useParams().conversationId ?? '';
  const conversation = useConversation(conversationId);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-neutral-800 px-6 py-4">
        <h1 className="truncate text-lg font-semibold text-neutral-100">
          {conversationTitle(conversation.data)}
        </h1>
      </header>
      <section
        aria-label="Messages"
        className="min-h-0 flex-1 overflow-y-auto p-6">
        <p className="text-sm text-neutral-500">
          This conversation's messages will appear here.
        </p>
      </section>
    </div>
  );
}

interface MissingConversationProps {
  message: string;
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

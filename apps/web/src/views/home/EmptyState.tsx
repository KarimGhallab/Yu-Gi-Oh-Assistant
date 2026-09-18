import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Language } from '@ygo-assistant/contracts';

import PromptSurface from '../../shared/components/PromptSurface.js';
import {
  seedConversation,
  useModels,
  useStartConversation
} from '../../shared/conversationQueries.js';
import { navigateWithTransition } from '../../shared/navigateWithTransition.js';
import { pendingRequestState } from '../../shared/pendingRequest.js';

import { ExamplePromptList } from '../conversation/ExamplePrompts.js';

/**
 * What the chat shows when no conversation is open: the request, ready to be
 * typed, and the settings it will be run with. Sending it starts the
 * conversation with those settings and asks the request in it, which is what the
 * sidebar's New does with the request already in hand.
 *
 * The words stay in the field until the conversation exists, because until then
 * the field is the only place they are, and a conversation that could not be
 * started says so above the prompt rather than taking the request with it.
 */
export default function EmptyState() {
  const start = useStartConversation();
  const listing = useModels();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>(Language.English);
  const [chosen, setChosen] = useState<string | undefined>(undefined);

  // What a conversation nobody has chosen a model for is answered by, as the
  // server reports it, so the control shows what will answer before the request
  // is sent rather than guessing at the rule.
  const model = chosen ?? listing.data?.default ?? '';

  const begin = async (request: string): Promise<void> => {
    start.reset();

    try {
      // The settings are the player's before the conversation is, so they are
      // what it is created with rather than something moved afterwards. The model
      // is left out only when the machine has not said yet what it has, which
      // leaves the server to pick the same first model this control is showing.
      const conversation = await start.mutateAsync({
        language,
        ...(model.length === 0 ? {} : { model })
      });

      // The conversation exists and holds no messages, which is what the surface
      // it opens on would have to ask for. Standing it up here instead lets the
      // prompt be seen moving into the conversation it just started.
      seedConversation(client, conversation);

      // The prompt is carried into the conversation as one movement: the
      // navigation is made inside a view transition, which is the router's
      // business in a data router and this app's own business here.
      navigateWithTransition(
        navigate,
        `/c/${conversation.id}`,
        pendingRequestState(request)
      );
    } catch {
      // The failure is the mutation's own error, rendered above the prompt.
    }
  };

  // Centred while it fits and scrollable when it does not, which a column that
  // centres its content cannot do at the same time.
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="m-auto flex w-full flex-col gap-6">
        <section className="px-6 text-center">
          <h1 className="text-lg font-semibold text-neutral-100">
            Start a conversation
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-neutral-400">
            Describe the cards you are looking for.
          </p>
          <div className="mx-auto mt-4 max-w-md">
            <ExamplePromptList onChoose={prompt => void begin(prompt)} />
          </div>
        </section>

        <PromptSurface
          onSend={request => void begin(request)}
          running={start.isPending}
          language={language}
          model={model}
          models={listing.data?.models}
          onLanguage={setLanguage}
          onModel={setChosen}
          clearOnSend={false}
          head={
            start.error === null ? undefined : (
              <p role="alert" className="text-sm text-red-400">
                {start.error.message}
              </p>
            )
          }
        />
      </div>
    </div>
  );
}

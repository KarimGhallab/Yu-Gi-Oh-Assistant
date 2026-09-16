import {
  type ChatMessage,
  type ChatRequest,
  ChatRole
} from '@ygo-assistant/ollama';

import type { StreamGroundedAnswerOptions } from '../types.js';
import { buildAnswerPrompt } from './prompt.js';

/**
 * An answer explains the cards it was given rather than inventing them, so the
 * model is asked for no creativity, the same as parsing.
 */
const ANSWER_TEMPERATURE = 0;

/**
 * Writes the answer to a request from the cards the search found, yielding each
 * piece of prose as the model produces it. The cards are the whole of what the
 * model is given to talk about, which is what makes a suggested card impossible
 * to invent.
 */
export async function* streamGroundedAnswer(
  options: StreamGroundedAnswerOptions
): AsyncGenerator<string> {
  const messages: ChatMessage[] = [
    {
      role: ChatRole.System,
      content: buildAnswerPrompt(options.cards, options.language)
    },
    { role: ChatRole.User, content: options.request }
  ];
  const request: ChatRequest = {
    model: options.model,
    messages,
    temperature: ANSWER_TEMPERATURE
  };

  for await (const chunk of options.client.chat(request)) {
    if (chunk.content.length > 0) {
      yield chunk.content;
    }
  }
}

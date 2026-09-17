import {
  type TurnEvent,
  type TurnRequest,
  turnEventSchema
} from '@ygo-assistant/contracts';

import { apiStream, malformedAnswer } from './apiClient.js';

/**
 * Runs a turn and yields the events it streams, in the order it streams them.
 *
 * A turn is a POST, so the browser's own event source cannot send it: the answer
 * is read frame by frame from the response body instead. A frame's event name is
 * data rather than transport, which is what keeps the turn's own `error` frame
 * from being read as the transport failing, and every frame is validated against
 * the shared contracts before it is handed on.
 */
export async function* streamTurn(
  conversationId: string,
  request: TurnRequest,
  signal?: AbortSignal
): AsyncGenerator<TurnEvent> {
  const body = await apiStream(
    `/api/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
      signal
    }
  );

  for await (const frame of readFrames(body)) {
    const payload = readData(frame);

    if (payload === undefined) {
      continue;
    }

    const event = turnEventSchema.safeParse(payload);

    if (!event.success) {
      throw malformedAnswer(event.error);
    }

    yield event.data;
  }
}

/**
 * The frames of a server-sent event body, in the order they arrive. A frame ends
 * at a blank line, and a body that ends without one still yields what it has, so
 * a server that closed mid-frame surfaces as a turn that stopped rather than as
 * a turn that vanished.
 */
async function* readFrames(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffered = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffered += decoder.decode(value, { stream: true });

      let end = buffered.indexOf('\n\n');
      while (end !== -1) {
        yield buffered.slice(0, end);
        buffered = buffered.slice(end + '\n\n'.length);
        end = buffered.indexOf('\n\n');
      }
    }
  } finally {
    // Releasing the body is courtesy to the server, not the caller's failure:
    // a body that errors on the way out must not become the error reported.
    await reader.cancel().catch(() => undefined);
  }

  buffered += decoder.decode();

  if (buffered.trim().length > 0) {
    yield buffered;
  }
}

/**
 * What a frame carries. The fields of a frame are its lines, and a frame with no
 * data is the transport's own heartbeat rather than something to read.
 */
function readData(frame: string): unknown {
  const data = frame
    .split('\n')
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice('data:'.length).trimStart())
    .join('\n');

  if (data.length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(data);
  } catch (error) {
    throw malformedAnswer(error);
  }
}

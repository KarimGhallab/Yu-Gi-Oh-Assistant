import { Ollama } from 'ollama';
import type { ZodType } from 'zod';

import { DomainError } from '@ygo-assistant/utils';

import {
  OllamaInvalidResponseError,
  OllamaModelNotFoundError,
  OllamaUnreachableError
} from '../errors.js';
import {
  chatChunkSchema,
  embedResponseSchema,
  responseErrorSchema,
  showResponseSchema,
  tagsResponseSchema
} from '../schemas.js';
import {
  type ChatChunk,
  type ChatRequest,
  type IOllamaClient,
  OllamaCapability,
  type OllamaClientOptions,
  type OllamaModel
} from '../types.js';

const HTTP_NOT_FOUND = 404;

/**
 * One Ollama server as the library client sees it: the client pointed at that
 * server, and the URL it was pointed at, which the failure messages name.
 */
interface OllamaConnection {
  client: Ollama;
  baseUrl: string;
}

/**
 * What the caller knows about a request, used to build a helpful error message.
 */
interface OllamaRequestContext {
  operation: string;
  model?: string;
}

const connect = (baseUrl: string): OllamaConnection => ({
  client: new Ollama({ host: baseUrl }),
  baseUrl
});

/**
 * Talks to a configured Ollama server through the official `ollama` library.
 * The library owns the HTTP, the newline-delimited stream, and the transport
 * errors; this client keeps the application's own contract on top of it: every
 * payload is validated before it is trusted, every failure is one of the typed
 * errors, and the base URL and the embedding URL may be two different servers.
 * The composition root builds one of these from configuration; tests substitute
 * the shared fake instead.
 */
export class OllamaClient implements IOllamaClient {
  private readonly _options: OllamaClientOptions;
  private readonly _connection: OllamaConnection;
  private readonly _embeddingConnection: OllamaConnection;

  constructor(options: OllamaClientOptions) {
    this._options = options;
    this._connection = connect(options.baseUrl);
    this._embeddingConnection = connect(options.embeddingBaseUrl);
  }

  /**
   * Lists the models installed on the server with what each can do: whether it
   * can complete at all, which is what answering a turn needs, and whether the
   * parsing stage can hold it to a shape.
   */
  async listModels(): Promise<OllamaModel[]> {
    const listed = await this._read(
      this._connection,
      () => this._connection.client.list(),
      tagsResponseSchema,
      { operation: 'list models' }
    );

    return Promise.all(
      listed.models.map(model => this._describeModel(model.name))
    );
  }

  /**
   * Embeds a batch of texts in one request against the embedding endpoint,
   * returning one vector per input at the configured dimensions.
   */
  async embed(inputs: string[]): Promise<number[][]> {
    const { embeddings } = await this._read(
      this._embeddingConnection,
      () =>
        this._embeddingConnection.client.embed({
          model: this._options.embeddingModel,
          input: inputs,
          dimensions: this._options.embeddingDimensions
        }),
      embedResponseSchema,
      { operation: 'embed texts', model: this._options.embeddingModel }
    );

    if (embeddings.length !== inputs.length) {
      throw new OllamaInvalidResponseError(
        'embed texts',
        `expected ${inputs.length} vectors but received ${embeddings.length}`
      );
    }

    const expectedDimensions = this._options.embeddingDimensions;
    if (embeddings.some(vector => vector.length !== expectedDimensions)) {
      throw new OllamaInvalidResponseError(
        'embed texts',
        `expected every vector to have ${expectedDimensions} dimensions`
      );
    }

    return embeddings;
  }

  /**
   * Streams a chat completion from the base URL, yielding one chunk per content
   * message and a final chunk marked done. An optional JSON schema constrains
   * the output through Ollama's structured-output format.
   */
  chat(request: ChatRequest): AsyncIterable<ChatChunk> {
    return this._streamChat(request);
  }

  /**
   * Asks the server what one installed model can do. A model that reports no
   * capabilities at all is one Ollama built before it reported any.
   */
  private async _describeModel(name: string): Promise<OllamaModel> {
    const details = await this._read(
      this._connection,
      () => this._connection.client.show({ model: name }),
      showResponseSchema,
      { operation: `inspect model "${name}"`, model: name }
    );

    const supportsCompletion = (details.capabilities ?? []).includes(
      OllamaCapability.Completion
    );

    // Ollama reports no capability for structured output, and a model that can
    // complete is the one that accepts a format, so the parsing stage's question
    // is answered by the completion capability it reports.
    return {
      name,
      supportsCompletion,
      supportsStructuredOutput: supportsCompletion
    };
  }

  private async *_streamChat(request: ChatRequest): AsyncGenerator<ChatChunk> {
    const context: OllamaRequestContext = {
      operation: 'stream a chat completion',
      model: request.model
    };
    const stream = await this._call(
      this._connection,
      () =>
        this._connection.client.chat({
          model: request.model,
          messages: request.messages,
          stream: true,
          format: request.format,
          options:
            request.temperature === undefined
              ? undefined
              : { temperature: request.temperature }
        }),
      context
    );

    try {
      for await (const response of stream) {
        const parsed = chatChunkSchema.safeParse(response);
        if (!parsed.success) {
          throw new OllamaInvalidResponseError(
            context.operation,
            'a stream line did not match the expected shape'
          );
        }
        yield { content: parsed.data.message.content, done: parsed.data.done };
      }
    } catch (error) {
      throw toOllamaError(this._connection, error, context);
    }
  }

  /**
   * Runs one call to the library and turns whatever it throws into this
   * package's own error, so callers only ever see the client's failures.
   */
  private async _call<T>(
    connection: OllamaConnection,
    action: () => Promise<T>,
    context: OllamaRequestContext
  ): Promise<T> {
    try {
      return await action();
    } catch (error) {
      throw toOllamaError(connection, error, context);
    }
  }

  /**
   * Runs one call and validates its payload before returning it, so a response
   * that does not match the shape the client reads becomes a typed failure
   * rather than a value that breaks the caller somewhere else.
   */
  private async _read<T>(
    connection: OllamaConnection,
    action: () => Promise<unknown>,
    schema: ZodType<T>,
    context: OllamaRequestContext
  ): Promise<T> {
    const payload = await this._call(connection, action, context);

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new OllamaInvalidResponseError(
        context.operation,
        'the response did not match the expected shape'
      );
    }

    return parsed.data;
  }
}

/**
 * Turns a failure from the library into this package's typed error. The
 * library's `ResponseError` is not exported, so a non-2xx answer is recognised
 * by its shape; a failed fetch surfaces as a TypeError; anything else is a
 * response that could not be read.
 */
function toOllamaError(
  connection: OllamaConnection,
  error: unknown,
  context: OllamaRequestContext
): Error {
  // A failure this package raised (a stream line that did not match, say) is
  // already the answer and must not be wrapped a second time.
  if (error instanceof DomainError) {
    return error;
  }

  const response = responseErrorSchema.safeParse(error);
  if (response.success) {
    if (
      response.data.status_code === HTTP_NOT_FOUND &&
      context.model !== undefined
    ) {
      return new OllamaModelNotFoundError(context.model);
    }
    return new OllamaInvalidResponseError(
      context.operation,
      response.data.message
    );
  }

  if (error instanceof TypeError) {
    return new OllamaUnreachableError(connection.baseUrl);
  }

  const detail = error instanceof Error ? error.message : 'an unknown failure';
  return new OllamaInvalidResponseError(context.operation, detail);
}

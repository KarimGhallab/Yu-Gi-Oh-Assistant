import { OllamaHttp } from '../OllamaHttp.js';
import { OllamaInvalidResponseError } from '../errors.js';
import {
  chatChunkSchema,
  embedResponseSchema,
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

/**
 * Talks to a configured Ollama server over HTTP. The composition root builds
 * one of these from configuration; tests substitute the shared fake instead.
 */
export class OllamaClient implements IOllamaClient {
  private readonly _options: OllamaClientOptions;
  private readonly _http: OllamaHttp;
  private readonly _embeddingHttp: OllamaHttp;

  constructor(options: OllamaClientOptions) {
    this._options = options;
    this._http = new OllamaHttp(options.baseUrl);
    this._embeddingHttp = new OllamaHttp(options.embeddingBaseUrl);
  }

  /**
   * Lists the models installed on the server with what each can do: whether it
   * can complete at all, which is what answering a turn needs, and whether the
   * parsing stage can hold it to a shape.
   */
  async listModels(): Promise<OllamaModel[]> {
    const { models } = await this._http.getJson(
      '/api/tags',
      tagsResponseSchema,
      { operation: 'list models' }
    );

    return Promise.all(
      models.map(async model => {
        const details = await this._http.postJson(
          '/api/show',
          { model: model.name },
          showResponseSchema,
          { operation: `inspect model "${model.name}"`, model: model.name }
        );

        const supportsCompletion = (details.capabilities ?? []).includes(
          OllamaCapability.Completion
        );

        // Ollama reports no capability for structured output, and a model that
        // can complete is the one that accepts a format, so the parsing stage's
        // question is answered by the completion capability it reports.
        return {
          name: model.name,
          supportsCompletion,
          supportsStructuredOutput: supportsCompletion
        };
      })
    );
  }

  /**
   * Embeds a batch of texts in one request against the embedding endpoint,
   * returning one vector per input at the configured dimensions.
   */
  async embed(inputs: string[]): Promise<number[][]> {
    const { embeddings } = await this._embeddingHttp.postJson(
      '/api/embed',
      {
        model: this._options.embeddingModel,
        input: inputs,
        dimensions: this._options.embeddingDimensions
      },
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

  private async *_streamChat(request: ChatRequest): AsyncGenerator<ChatChunk> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      stream: true
    };
    if (request.format !== undefined) {
      body.format = request.format;
    }
    if (request.temperature !== undefined) {
      body.options = { temperature: request.temperature };
    }

    for await (const chunk of this._http.streamNdjson(
      '/api/chat',
      body,
      chatChunkSchema,
      { operation: 'stream a chat completion', model: request.model }
    )) {
      yield { content: chunk.message.content, done: chunk.done };
    }
  }
}

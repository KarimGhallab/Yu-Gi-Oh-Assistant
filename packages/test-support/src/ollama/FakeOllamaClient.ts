import type {
  ChatChunk,
  ChatRequest,
  IOllamaClient,
  OllamaModel
} from '@ygo-assistant/ollama';

const DEFAULT_EMBEDDING_DIMENSION = 1024;

const DEFAULT_CHAT_CHUNKS: ChatChunk[] = [
  { content: 'canned answer', done: true }
];

/**
 * Canned responses the fake returns. Anything omitted falls back to a sensible
 * default so a test only states the behaviour it cares about.
 */
export interface FakeOllamaResponses {
  models?: OllamaModel[];
  embeddings?: number[][];
  /** What every chat call streams, when the calls do not differ. */
  chatChunks?: ChatChunk[];
  /**
   * One script per chat call, for the turns that ask a model more than once:
   * the nth call streams the nth script. A call past the end of the scripts
   * falls back to `chatChunks`.
   */
  chatResponses?: ChatChunk[][];
  /**
   * One failure per chat call, by the same index as `chatResponses`: the call
   * streams whatever its script holds and then throws, which is what a model
   * that dies partway through an answer looks like.
   */
  chatFailures?: (Error | undefined)[];
}

/**
 * In-memory Ollama client for tests. It returns the canned responses and
 * records every call so a test can assert on what the application asked for.
 */
export class FakeOllamaClient implements IOllamaClient {
  public readonly embeddedInputs: string[][] = [];
  public readonly chatRequests: ChatRequest[] = [];

  constructor(private readonly _responses: FakeOllamaResponses = {}) {}

  async listModels(): Promise<OllamaModel[]> {
    return this._responses.models ?? [];
  }

  async embed(inputs: string[]): Promise<number[][]> {
    this.embeddedInputs.push(inputs);
    if (this._responses.embeddings) {
      return this._responses.embeddings;
    }
    return inputs.map(() =>
      new Array<number>(DEFAULT_EMBEDDING_DIMENSION).fill(0)
    );
  }

  chat(request: ChatRequest): AsyncIterable<ChatChunk> {
    this.chatRequests.push(request);
    const call = this.chatRequests.length - 1;
    const scripted = this._responses.chatResponses?.[call];
    const chunks =
      scripted ?? this._responses.chatChunks ?? DEFAULT_CHAT_CHUNKS;
    const failure = this._responses.chatFailures?.[call];

    return {
      [Symbol.asyncIterator]: async function* () {
        for (const chunk of chunks) {
          yield chunk;
        }
        if (failure !== undefined) {
          throw failure;
        }
      }
    };
  }
}

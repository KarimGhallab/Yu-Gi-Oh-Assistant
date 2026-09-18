/**
 * Role of a message in a chat exchange.
 */
export enum ChatRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant'
}

/**
 * Capabilities Ollama can report for an installed model. Only the capabilities
 * the client reasons about are enumerated.
 */
export enum OllamaCapability {
  Completion = 'completion'
}

/**
 * A model available on the configured Ollama instance, with what it can do. The
 * completion capability is the one Ollama reports for it; whether it can be held
 * to a shape is the application's own answer, since Ollama reports no capability
 * for that at all.
 */
export interface OllamaModel {
  name: string;
  supportsCompletion: boolean;
  supportsStructuredOutput: boolean;
}

/**
 * Configuration the concrete client needs. It mirrors the server's Ollama
 * configuration for the fields the client uses, so the composition root can
 * pass it through unchanged.
 */
export interface OllamaClientOptions {
  baseUrl: string;
  embeddingBaseUrl: string;
  embeddingModel: string;
  embeddingDimensions: number;
}

/**
 * One message in a chat completion request.
 */
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/**
 * A streamed chat completion request.
 */
export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  format?: Record<string, unknown>;
  temperature?: number;
}

/**
 * One chunk of a streamed chat completion.
 */
export interface ChatChunk {
  content: string;
  done: boolean;
}

/**
 * The Ollama surface the rest of the application depends on. The concrete
 * client and the test double both implement it, so callers never construct
 * HTTP requests themselves.
 */
export interface IOllamaClient {
  listModels(): Promise<OllamaModel[]>;
  embed(inputs: string[]): Promise<number[][]>;
  chat(request: ChatRequest): AsyncIterable<ChatChunk>;
}

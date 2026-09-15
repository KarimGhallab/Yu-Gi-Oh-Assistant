/**
 * Role of a message in a chat exchange.
 */
export enum ChatRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant'
}

/**
 * A model available on the configured Ollama instance.
 */
export interface OllamaModel {
  name: string;
  supportsStructuredOutput: boolean;
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

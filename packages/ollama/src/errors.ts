import { DomainError, HttpStatus } from '@ygo-assistant/utils';

/**
 * The Ollama server could not be reached at all, so no request was answered.
 */
export class OllamaUnreachableError extends DomainError {
  constructor(baseUrl: string) {
    super(
      `Ollama server unreachable at ${baseUrl}. Check that Ollama is running and reachable.`,
      HttpStatus.ServiceUnavailable
    );
  }
}

/**
 * The server answered but does not have the requested model installed.
 */
export class OllamaModelNotFoundError extends DomainError {
  constructor(model: string) {
    super(
      `Ollama model "${model}" is not installed. Run "ollama pull ${model}" to install it.`,
      HttpStatus.NotFound
    );
  }
}

/**
 * The server answered but the answer did not match the shape the client
 * expects, so it cannot be trusted.
 */
export class OllamaInvalidResponseError extends DomainError {
  constructor(operation: string, detail: string) {
    super(
      `Ollama returned an invalid response while trying to ${operation}: ${detail}.`,
      HttpStatus.BadGateway
    );
  }
}

import { z } from 'zod';

import {
  OllamaInvalidResponseError,
  OllamaModelNotFoundError,
  OllamaUnreachableError
} from './errors.js';

/**
 * What the caller knows about a request, used to build a helpful error message.
 */
export interface OllamaRequestContext {
  operation: string;
  model?: string;
}

/**
 * The HTTP transport shared by every Ollama operation. It turns transport and
 * payload failures into the client's typed errors, and validates each response
 * against a schema before returning it.
 */
export class OllamaHttp {
  constructor(private readonly _baseUrl: string) {}

  async getJson<T>(
    path: string,
    schema: z.ZodType<T>,
    context: OllamaRequestContext
  ): Promise<T> {
    return this._requestJson('GET', path, undefined, schema, context);
  }

  async postJson<T>(
    path: string,
    body: unknown,
    schema: z.ZodType<T>,
    context: OllamaRequestContext
  ): Promise<T> {
    return this._requestJson('POST', path, body, schema, context);
  }

  /**
   * Posts a request and yields one validated value per newline-delimited JSON
   * line, so a streamed response is validated as it arrives.
   */
  async *streamNdjson<T>(
    path: string,
    body: unknown,
    schema: z.ZodType<T>,
    context: OllamaRequestContext
  ): AsyncGenerator<T> {
    const response = await this._fetch('POST', path, body, context);
    const bodyStream = response.body;
    if (bodyStream === null) {
      throw new OllamaInvalidResponseError(
        context.operation,
        'the response had no body'
      );
    }

    const reader = bodyStream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) {
          break;
        }
        buffer += decoder.decode(chunk.value, { stream: true });

        let newlineIndex = buffer.indexOf('\n');
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          const parsed = this._parseJsonLine(line, schema, context);
          if (parsed !== undefined) {
            yield parsed;
          }
          newlineIndex = buffer.indexOf('\n');
        }
      }

      buffer += decoder.decode();
      const trailing = this._parseJsonLine(buffer, schema, context);
      if (trailing !== undefined) {
        yield trailing;
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async _requestJson<T>(
    method: 'GET' | 'POST',
    path: string,
    body: unknown,
    schema: z.ZodType<T>,
    context: OllamaRequestContext
  ): Promise<T> {
    const response = await this._fetch(method, path, body, context);

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new OllamaInvalidResponseError(
        context.operation,
        'the response body was not valid JSON'
      );
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new OllamaInvalidResponseError(
        context.operation,
        'the response did not match the expected shape'
      );
    }

    return parsed.data;
  }

  private async _fetch(
    method: 'GET' | 'POST',
    path: string,
    body: unknown,
    context: OllamaRequestContext
  ): Promise<Response> {
    const url = `${this._baseUrl}${path}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch {
      throw new OllamaUnreachableError(this._baseUrl);
    }

    if (response.status === 404 && context.model !== undefined) {
      throw new OllamaModelNotFoundError(context.model);
    }

    if (!response.ok) {
      throw new OllamaInvalidResponseError(
        context.operation,
        await describeFailure(response)
      );
    }

    return response;
  }

  private _parseJsonLine<T>(
    line: string,
    schema: z.ZodType<T>,
    context: OllamaRequestContext
  ): T | undefined {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(trimmed);
    } catch {
      throw new OllamaInvalidResponseError(
        context.operation,
        'a stream line was not valid JSON'
      );
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new OllamaInvalidResponseError(
        context.operation,
        'a stream line did not match the expected shape'
      );
    }

    return parsed.data;
  }
}

const MAX_ERROR_BODY_LENGTH = 500;

/**
 * Builds the detail for an unexpected status, including the server's message so
 * the cause is visible instead of a bare status code.
 */
async function describeFailure(response: Response): Promise<string> {
  const body = await response.text().catch(() => '');
  const message = body.trim();
  if (message.length === 0) {
    return `unexpected status ${response.status}`;
  }
  return `unexpected status ${response.status}: ${message.slice(0, MAX_ERROR_BODY_LENGTH)}`;
}

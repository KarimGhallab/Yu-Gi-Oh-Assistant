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

  private async _requestJson<T>(
    method: 'GET' | 'POST',
    path: string,
    body: unknown,
    schema: z.ZodType<T>,
    context: OllamaRequestContext
  ): Promise<T> {
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
        `unexpected status ${response.status}`
      );
    }

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
}

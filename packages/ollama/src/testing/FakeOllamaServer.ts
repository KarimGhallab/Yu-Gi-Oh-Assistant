import {
  type IncomingMessage,
  type Server,
  type ServerResponse,
  createServer
} from 'node:http';

/**
 * A request the fake server observed, with its JSON body already parsed.
 */
export interface FakeOllamaRequest {
  method: string;
  path: string;
  body: unknown;
}

/**
 * The response the fake server should write for a request. Omitting the status
 * means 200 and omitting the body means an empty JSON object.
 */
export interface FakeOllamaResponse {
  status?: number;
  json?: unknown;
}

export type FakeOllamaHandler = (
  request: FakeOllamaRequest
) => FakeOllamaResponse | Promise<FakeOllamaResponse>;

/**
 * An in-process HTTP server that stands in for Ollama. It binds to an
 * ephemeral loopback port so tests never reach the network or a real Ollama
 * install, and the handler decides what each request receives. Test files use
 * it to drive the real client over a real socket.
 */
export class FakeOllamaServer {
  private _server: Server | undefined;
  private _baseUrl: string | undefined;

  /**
   * The URL the server is reachable at. Only valid once started.
   */
  get baseUrl(): string {
    if (this._baseUrl === undefined) {
      throw new Error('The fake Ollama server has not been started');
    }
    return this._baseUrl;
  }

  async start(handler: FakeOllamaHandler): Promise<string> {
    const server = createServer((request, response) => {
      void this._respond(request, response, handler);
    });
    await new Promise<void>(resolve => {
      server.listen(0, '127.0.0.1', () => resolve());
    });

    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('The fake Ollama server did not bind to a TCP port');
    }

    this._server = server;
    this._baseUrl = `http://127.0.0.1:${address.port}`;
    return this._baseUrl;
  }

  async stop(): Promise<void> {
    const server = this._server;
    this._server = undefined;
    this._baseUrl = undefined;

    if (server === undefined) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
  }

  private async _respond(
    request: IncomingMessage,
    response: ServerResponse,
    handler: FakeOllamaHandler
  ): Promise<void> {
    try {
      const body = await this._readBody(request);
      const result = await handler({
        method: request.method ?? 'GET',
        path: request.url ?? '/',
        body
      });
      response.statusCode = result.status ?? 200;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(result.json ?? {}));
    } catch {
      response.statusCode = 500;
      response.end();
    }
  }

  private async _readBody(request: IncomingMessage): Promise<unknown> {
    let raw = '';
    for await (const chunk of request) {
      raw += String(chunk);
    }

    if (raw.length === 0) {
      return undefined;
    }

    const parsed: unknown = JSON.parse(raw);
    return parsed;
  }
}

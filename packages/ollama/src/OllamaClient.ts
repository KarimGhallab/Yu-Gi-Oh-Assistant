import { OllamaHttp } from './http.js';
import { showResponseSchema, tagsResponseSchema } from './schemas.js';
import {
  OllamaCapability,
  type OllamaClientOptions,
  type OllamaModel
} from './types.js';

/**
 * Talks to a configured Ollama server over HTTP. The composition root builds
 * one of these from configuration; tests substitute the shared fake instead.
 */
export class OllamaClient {
  private readonly _options: OllamaClientOptions;
  private readonly _http: OllamaHttp;

  constructor(options: OllamaClientOptions) {
    this._options = options;
    this._http = new OllamaHttp(options.baseUrl);
  }

  /**
   * Lists the models installed on the server, flagging the ones that support
   * structured output so the parsing stage can pick its strategy.
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

        const capabilities = details.capabilities ?? [];
        return {
          name: model.name,
          supportsStructuredOutput: capabilities.includes(
            OllamaCapability.Completion
          )
        };
      })
    );
  }
}

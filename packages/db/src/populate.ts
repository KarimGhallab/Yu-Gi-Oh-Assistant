import { type Card, Language } from '@ygo-assistant/cards';
import type { ILogger } from '@ygo-assistant/logger';
import type { IOllamaClient } from '@ygo-assistant/ollama';

import { buildCardIndex } from './catalog/cardIndex.js';
import { computeDatasetVersion } from './catalog/datasetVersion.js';
import { convertCardInfoResponse } from './ygoprodeck/convertCards.js';
import { fetchCardDump } from './ygoprodeck/fetchCardDump.js';

/**
 * The languages the catalog is populated in.
 */
const POPULATED_LANGUAGES: readonly Language[] = [
  Language.English,
  Language.French
];

export interface PopulateCardIndexOptions {
  dataDir: string;
  logger: ILogger;
  embedder: IOllamaClient;
  embeddingModel: string;
  dimensions: number;
  baseUrl?: string;
}

export interface PopulateCardIndexSummary {
  datasetVersion: string;
  cards: number;
}

/**
 * The whole ingestion path: fetch each language's dump, convert it, embed the
 * composed documents, and write the index and its metadata in one run.
 */
export async function populateCardIndex(
  options: PopulateCardIndexOptions
): Promise<PopulateCardIndexSummary> {
  const cards: Card[] = [];

  for (const language of POPULATED_LANGUAGES) {
    options.logger.info('Fetching card dump', { language });
    const payload = await fetchCardDump({
      dataDir: options.dataDir,
      language,
      baseUrl: options.baseUrl
    });

    const converted = convertCardInfoResponse(payload, language);
    options.logger.info('Converted card dump', {
      language,
      cards: converted.length
    });
    cards.push(...converted);
  }

  const datasetVersion = computeDatasetVersion(cards);
  options.logger.info('Embedding cards', {
    cards: cards.length,
    embeddingModel: options.embeddingModel
  });

  await buildCardIndex({
    dataDir: options.dataDir,
    cards,
    embedder: options.embedder,
    embeddingModel: options.embeddingModel,
    dimensions: options.dimensions,
    datasetVersion
  });

  return { datasetVersion, cards: cards.length };
}

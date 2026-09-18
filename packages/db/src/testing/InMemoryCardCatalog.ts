import {
  type Card,
  type CardFilters,
  type Language,
  cardMatchesFilters
} from '@ygo-assistant/cards';

import {
  ICardCatalog,
  ScanOptions,
  SearchOptions
} from '../catalog/ICardCatalog.js';
import type {
  IndexMetadata,
  IndexedCardRow,
  ScoredCard
} from '../catalog/types.js';

export interface InMemoryCardCatalogOptions {
  rows: IndexedCardRow[];
  metadata?: IndexMetadata;
}

/**
 * A card catalog held in memory, for tests that need the read surface without a
 * LanceDB directory. It answers the same port as the real adapter: the language
 * partition and the limit are honored, `search` computes cosine similarity the
 * way the index reports it, and `scan` matches with the same in-process
 * predicate the index's SQL stands in for.
 */
export class InMemoryCardCatalog implements ICardCatalog {
  private readonly _rows: IndexedCardRow[];
  private readonly _indexMetadata: IndexMetadata | undefined;

  constructor(options: InMemoryCardCatalogOptions) {
    this._rows = options.rows;
    this._indexMetadata = options.metadata;
  }

  async search(options: SearchOptions): Promise<ScoredCard[]> {
    return this._matching(options)
      .map(row => ({
        card: toCard(row),
        score: cosineSimilarity(options.vector, row.vector)
      }))
      .sort(
        (left, right) =>
          right.score - left.score || left.card.id - right.card.id
      )
      .slice(0, options.limit);
  }

  async scan(options: ScanOptions): Promise<Card[]> {
    return this._matching(options)
      .sort(byIdentity)
      .slice(0, options.limit)
      .map(toCard);
  }

  async readByIds(options: {
    ids: number[];
    language: Language;
  }): Promise<Card[]> {
    if (options.ids.length === 0) {
      return [];
    }

    const wanted = new Set(options.ids);
    const preferred = new Map<number, Card>();
    const fallback = new Map<number, Card>();
    for (const row of this._rows) {
      if (!wanted.has(row.id)) {
        continue;
      }
      const card = toCard(row);
      const language =
        card.language === options.language ? preferred : fallback;
      if (!language.has(card.id)) {
        language.set(card.id, card);
      }
    }

    return options.ids.flatMap(id => {
      const card = preferred.get(id) ?? fallback.get(id);
      return card === undefined ? [] : [card];
    });
  }

  async archetypes(): Promise<string[]> {
    const archetypes = new Set<string>();
    for (const row of this._rows) {
      if (typeof row.archetype === 'string' && row.archetype.length > 0) {
        archetypes.add(row.archetype);
      }
    }
    return [...archetypes].sort();
  }

  async metadata(): Promise<IndexMetadata | undefined> {
    return this._indexMetadata;
  }

  private _matching(options: {
    language: Language;
    filters: CardFilters;
  }): IndexedCardRow[] {
    return this._rows.filter(
      row =>
        row.language === options.language &&
        cardMatchesFilters(row, options.filters)
    );
  }
}

function toCard(row: IndexedCardRow): Card {
  const card: IndexedCardRow = { ...row };
  delete (card as { vector?: number[] }).vector;
  return card;
}

function byIdentity(left: IndexedCardRow, right: IndexedCardRow): number {
  if (left.id !== right.id) {
    return left.id - right.id;
  }
  if (left.name === right.name) {
    return 0;
  }
  return left.name < right.name ? -1 : 1;
}

function cosineSimilarity(left: number[], right: number[]): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index++) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }
  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

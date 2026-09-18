import { type Table, connect } from '@lancedb/lancedb';

import type { Card, Language } from '@ygo-assistant/cards';

import { ICardCatalog, ScanOptions, SearchOptions } from './ICardCatalog.js';
import { buildIdClause, buildWhereClause } from './cardPredicates.js';
import { CARDS_TABLE } from './constants.js';
import { readIndexMetadata } from './indexMetadata.js';
import { indexDirectory } from './indexPaths.js';
import { normalizeCard } from './normalizeCard.js';
import type { IndexMetadata, ScoredCard } from './types.js';

const COSINE_DISTANCE_TYPE = 'cosine';
const DISTANCE_COLUMN = '_distance';
const IDENTITY_ORDER = [
  { columnName: 'id', ascending: true },
  { columnName: 'name', ascending: true }
];

export class CardCatalog implements ICardCatalog {
  private static _instanceByDir = new Map<string, CardCatalog>();

  static async getInstance(dataDir: string): Promise<CardCatalog> {
    let instance = CardCatalog._instanceByDir.get(dataDir);
    if (!instance) {
      instance = new CardCatalog(dataDir);
      CardCatalog._instanceByDir.set(dataDir, instance);
    }
    return instance;
  }

  /**
   * The table, opened once on first use. An index that was never built is a
   * state a caller answers for rather than an error here, so opening is deferred
   * until a method actually reads cards; `metadata` reads the index metadata
   * file alone, and reads nothing at all when the index is absent.
   */
  private _table?: Promise<Table>;

  private constructor(private readonly _dataDir: string) {}

  private _openTable(): Promise<Table> {
    this._table ??= this._connectTable();
    return this._table;
  }

  private async _connectTable(): Promise<Table> {
    const db = await connect(indexDirectory(this._dataDir));
    return db.openTable(CARDS_TABLE);
  }

  /**
   * Searches one language partition by a query vector, returning the nearest
   * cards with their cosine similarity to it, closest first. Structured filters
   * narrow the partition before the vector search runs.
   */
  async search(options: SearchOptions): Promise<ScoredCard[]> {
    const table = await this._openTable();
    const rows = await table
      .query()
      .nearestTo(options.vector)
      .distanceType(COSINE_DISTANCE_TYPE)
      .where(buildWhereClause(options.language, options.filters))
      .limit(options.limit)
      .toArray();

    return rows.map(row => ({
      card: normalizeCard(row),
      score: this._cosineSimilarity(row)
    }));
  }

  /**
   * Reads the cards of one language partition that match the structured filters,
   * with no vector involved. The rows come back in a stable identity order so a
   * filter-only request is reproducible.
   */
  async scan(options: ScanOptions): Promise<Card[]> {
    const table = await this._openTable();
    const rows = await table
      .query()
      .where(buildWhereClause(options.language, options.filters))
      .orderBy(IDENTITY_ORDER)
      .limit(options.limit)
      .toArray();

    return rows.map(row => normalizeCard(row));
  }

  /**
   * Reads specific cards by id, in the order they were asked for. A card the
   * preferred language has comes back in it, and a card it lacks comes back in the
   * language that has it, so a caller never loses a card to the language it
   * happened to ask in. An id no language has is left out, which is the only way a
   * stored card can disappear: the index no longer holds it.
   */
  async readByIds(options: {
    ids: number[];
    language: Language;
  }): Promise<Card[]> {
    if (options.ids.length === 0) {
      return [];
    }

    const table = await this._openTable();
    const rows = await table
      .query()
      .where(buildIdClause(options.ids))
      .toArray();

    const preferred = new Map<number, Card>();
    const fallback = new Map<number, Card>();
    for (const row of rows) {
      const card = normalizeCard(row);
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

  /**
   * Reads the archetypes the index carries, sorted, so a client can offer the ones
   * that are really there rather than a list kept by hand that drifts from the
   * data. A card with no archetype contributes nothing, and a rebuild is what the
   * list follows, since it is read from the index every time.
   */
  async archetypes(): Promise<string[]> {
    const table = await this._openTable();
    const rows = await table.query().select(['archetype']).toArray();

    const archetypes = new Set<string>();
    for (const row of rows) {
      const archetype = row.archetype;
      if (typeof archetype === 'string' && archetype.length > 0) {
        archetypes.add(archetype);
      }
    }

    return [...archetypes].sort();
  }

  /**
   * Reads the metadata written with an index. No metadata file at all means the
   * index was never built, which is a state a caller answers for rather than an
   * error here; a corrupt file still rejects, because a corrupt record is a
   * different problem from a missing one.
   */
  async metadata(): Promise<IndexMetadata | undefined> {
    try {
      return await readIndexMetadata(indexDirectory(this._dataDir));
    } catch (error) {
      if (this._isMissingFile(error)) {
        return undefined;
      }
      throw error;
    }
  }

  private _isMissingFile(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    );
  }

  /**
   * LanceDB reports a cosine distance, which runs from 0 for identical vectors to
   * 2 for opposite ones; the application reasons in similarity instead.
   */
  private _cosineSimilarity(row: Record<string, unknown>): number {
    const distance = row[DISTANCE_COLUMN];
    if (typeof distance !== 'number') {
      throw new Error(
        `The index search did not return a numeric distance: ${String(distance)}`
      );
    }
    return 1 - distance;
  }
}

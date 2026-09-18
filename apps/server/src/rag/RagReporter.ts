import type { Language } from '@ygo-assistant/cards';
import type { RankedCard } from '@ygo-assistant/rag';

import type { PipelineEvent } from '../pipeline/runPipeline.js';

const ANSWER_RULE = '-'.repeat(60);

/**
 * Prints what the pipeline did, as it does it: each stage with how long it took,
 * the search the request resolved to, the ranking, and the answer as it streams.
 * In JSON mode it writes one line per event instead, for comparing two runs
 * rather than reading one.
 */
export class RagReporter {
  private readonly _startedAt = performance.now();
  private _stageStartedAt = performance.now();
  private _answering = false;

  constructor(private readonly _json: boolean) {}

  header(header: {
    prompt: string;
    language: Language;
    model: string;
    topK: number;
    shown: number;
    minScore: number;
  }): void {
    if (this._json) {
      this._print(JSON.stringify({ type: 'header', ...header }));
      return;
    }

    this._print(`Prompt:    ${header.prompt}`);
    this._print(`Language:  ${header.language}    Model: ${header.model}`);
    this._print(
      `Retrieval: topK ${header.topK}, shown ${header.shown}, minScore ${header.minScore}`
    );
  }

  event(event: PipelineEvent): void {
    if (this._json) {
      this._print(JSON.stringify(event));
      return;
    }

    if (event.type === 'search') {
      this._printSearch(event);
      return;
    }
    if (event.type === 'ranked') {
      this._printRanked(event.ranked);
      return;
    }
    if (event.type === 'selected') {
      this._printSelected(event);
      return;
    }

    this._printAnswer(event.text);
  }

  finish(): void {
    const seconds = this._secondsSince(this._startedAt);

    if (this._json) {
      this._print(JSON.stringify({ type: 'done', seconds }));
      return;
    }
    if (this._answering) {
      this._print('');
      this._print(ANSWER_RULE);
    }
    this._print(`Done in ${seconds}s`);
  }

  private _printSearch(
    event: Extract<PipelineEvent, { type: 'search' }>
  ): void {
    this._print('');
    this._print(`Search (${this._takeStage()}s)`);

    if (event.outcome !== undefined) {
      this._print(`  outcome: ${event.outcome}`);
    }
    this._print(`  filters: ${JSON.stringify(event.filters)}`);
    if (event.query !== undefined) {
      this._print(`  query:   ${JSON.stringify(event.query)}`);
    }
    if (event.status !== undefined) {
      this._print(`  status:  ${event.status}`);
    }
  }

  private _printRanked(ranked: RankedCard[]): void {
    this._print('');
    this._print(`Retrieval (${this._takeStage()}s)    ${ranked.length} ranked`);

    for (const candidate of ranked) {
      this._print(`  ${describeRanked(candidate)}`);
    }
  }

  private _printSelected(
    event: Extract<PipelineEvent, { type: 'selected' }>
  ): void {
    const seconds = this._takeStage();
    this._print('');

    if (event.pool === 0) {
      this._print(`Filter (${seconds}s)    not asked: nothing to judge`);
      return;
    }
    if (event.fellBack) {
      this._print(
        `Filter (${seconds}s)    the judgement failed, the ranking stands: ${event.cards.length} kept`
      );
    } else {
      this._print(
        `Filter (${seconds}s)    ${event.pool} judged, ${event.cards.length} kept`
      );
    }

    for (const card of event.cards) {
      this._print(`  ${card.name}`);
    }
  }

  private _printAnswer(text: string): void {
    if (!this._answering) {
      this._answering = true;
      this._print('');
      this._print('Answer');
      this._print(ANSWER_RULE);
    }

    process.stdout.write(text);
  }

  private _takeStage(): string {
    const seconds = this._secondsSince(this._stageStartedAt);
    this._stageStartedAt = performance.now();
    return seconds;
  }

  private _secondsSince(startedAt: number): string {
    return ((performance.now() - startedAt) / 1000).toFixed(1);
  }

  private _print(line: string): void {
    process.stdout.write(`${line}\n`);
  }
}

function describeRanked(candidate: RankedCard): string {
  const { card, score } = candidate;
  const facts: string[] = [card.type];

  if (card.attribute !== undefined) {
    facts.push(card.attribute);
  }
  facts.push(card.sourceUrl);

  return `${score.toFixed(3)}  ${card.name}  (${facts.join(', ')})`;
}

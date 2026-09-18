import { composeCardDocument } from '@ygo-assistant/db';
import type {
  FakeOllamaHandler,
  FakeOllamaRequest,
  FakeOllamaResponse
} from '@ygo-assistant/ollama/testing';

import {
  BLUE_EYES,
  CHAT_MODEL,
  EMBEDDING_DIMENSIONS,
  FIXTURE_CARDS,
  MONSTER_REBORN,
  SECOND_CHAT_MODEL,
  SOLEMN_JUDGMENT
} from './cards.js';

/**
 * The lead of the answer each model writes. The second model's lead is
 * different on purpose: it is how a test sees which model a turn was carried
 * by, since nothing else about the fake changes with the name.
 */
export const ANSWER_LEAD = 'Based on your request, these cards stand out:';
export const SECOND_MODEL_ANSWER_LEAD = 'The second model read your request:';

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatBody {
  model?: string;
  messages?: ChatMessage[];
  format?: { properties?: Record<string, unknown> };
}

interface ParseAnswer {
  filters?: unknown[];
  query?: string;
}

/**
 * The request a turn is scripted to understand, and what the parse answers for
 * it. The query is the card's own composed document, which the embedding map
 * already points at that card, so the search's rewrite ranks it first.
 */
const SCRIPTED_PARSES: Record<string, ParseAnswer> = {
  'a dragon with the highest attack': {
    filters: [{ field: 'type', operator: 'eq', value: 'Normal Monster' }],
    query: composeCardDocument(BLUE_EYES)
  },
  'a spell that brings a monster back': {
    query: composeCardDocument(MONSTER_REBORN)
  },
  'a trap that stops a summon': {
    query: composeCardDocument(SOLEMN_JUDGMENT)
  }
};

const VECTORS = new Map<string, number[]>(
  FIXTURE_CARDS.map((card, index): [string, number[]] => [
    composeCardDocument(card),
    basis(index)
  ])
);

/**
 * The fake Ollama. Every answer is decided by the request itself rather than by
 * a switch, so the suite stays safe to run in parallel and a failure fixture
 * cannot leak into a test that did not ask for it. Embeddings come from a small
 * map of the fixture cards' own documents, so the ranking a test expects is the
 * ranking it gets.
 */
export const ollamaHandler: FakeOllamaHandler = request =>
  respondTo(`${request.method} ${request.path}`, request);

async function respondTo(
  route: string,
  request: FakeOllamaRequest
): Promise<FakeOllamaResponse> {
  switch (route) {
    case 'GET /api/tags':
      return {
        json: { models: [{ name: CHAT_MODEL }, { name: SECOND_CHAT_MODEL }] }
      };
    case 'POST /api/show':
      return { json: { capabilities: ['completion'] } };
    case 'POST /api/embed':
      return { json: { embeddings: embed(request) } };
    case 'POST /api/chat':
      return { stream: chat(request) };
    default:
      return { status: 404, json: { error: 'not found' } };
  }
}

function embed(request: FakeOllamaRequest): number[][] {
  const body = request.body as { input?: string[] } | undefined;
  return (body?.input ?? []).map(vectorFor);
}

/**
 * A chat call is told apart by the shape it is constrained by: the filter's
 * format carries `keep`, the parse's carries `filters` and `query`, and the
 * answer's carries none at all, which is the only call that streams prose.
 */
function chat(request: FakeOllamaRequest): string[] {
  const body = request.body as ChatBody | undefined;
  const properties = body?.format?.properties ?? {};

  if ('keep' in properties) {
    return structured({ keep: keptIds(systemText(body)) });
  }

  if ('filters' in properties || 'query' in properties) {
    return structured(parseFor(userText(body)));
  }

  return answer(systemText(body), body?.model);
}

function parseFor(request: string): ParseAnswer {
  return SCRIPTED_PARSES[request] ?? { query: request };
}

/** The ids the filter's system prompt listed, which is the pool it judges. */
function keptIds(system: string): number[] {
  return [...system.matchAll(/^- (\d+):/gm)].map(match => Number(match[1]));
}

function answer(system: string, model: string | undefined): string[] {
  const names = [...system.matchAll(/^- (.+?) \(/gm)].map(match => match[1]);
  const lead =
    model === SECOND_CHAT_MODEL ? SECOND_MODEL_ANSWER_LEAD : ANSWER_LEAD;
  const markdown =
    names.length === 0
      ? 'I could not find a card that answers that request.'
      : [
          lead,
          '',
          ...names.map(name => `- **${name}** fits what you asked for.`)
        ].join('\n');

  return [...pieces(markdown).map(piece => line(piece, false)), line('', true)];
}

function structured(payload: unknown): string[] {
  return [line(JSON.stringify(payload), true)];
}

function line(content: string, done: boolean): string {
  return `${JSON.stringify({
    model: CHAT_MODEL,
    message: { role: 'assistant', content },
    done
  })}\n`;
}

function pieces(text: string): string[] {
  const size = 40;
  const parts: string[] = [];

  for (let at = 0; at < text.length; at += size) {
    parts.push(text.slice(at, at + size));
  }

  return parts;
}

function systemText(body: ChatBody | undefined): string {
  return (
    body?.messages?.find(message => message.role === 'system')?.content ?? ''
  );
}

function userText(body: ChatBody | undefined): string {
  const users =
    body?.messages?.filter(message => message.role === 'user') ?? [];
  return users.at(-1)?.content ?? '';
}

function vectorFor(text: string): number[] {
  return VECTORS.get(text) ?? basis(hash(text) % EMBEDDING_DIMENSIONS);
}

function basis(index: number): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  vector[index] = 1;
  return vector;
}

/** FNV-1a, so an unknown text still embeds to the same vector every run. */
function hash(text: string): number {
  let value = 2166136261;

  for (let at = 0; at < text.length; at++) {
    value ^= text.charCodeAt(at);
    value = Math.imul(value, 16777619);
  }

  return value >>> 0;
}

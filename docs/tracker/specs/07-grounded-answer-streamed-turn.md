# 07 - Grounded answer and streamed turn

- **Status:** Resolved (2026-09-16)
- **Kind:** spec
- **Blocked by:** 04, 05, 06
- **Source:** architecture grilling, 2026-09-15

## Problem Statement

The pieces exist separately: a parser, a retrieval engine, a conversation store,
and an Ollama client. Nothing turns a user message into a complete reply. The
previous prototype stopped after generating filters and never retrieved or
answered. The product needs one turn endpoint that orchestrates parsing,
retrieval, and a grounded answer, and streams the progress to the client.

## Solution

A turn endpoint that accepts a user message plus optional per-turn overrides,
runs parse, retrieve, and rank, streams typed SSE events, and persists the turn.
The answer is generated from the retrieved cards only, so it cannot invent
cards. This is the first complete vertical slice.

## User Stories

1. As a player, I want a reply to my request, so that I get card suggestions.
2. As a player, I want the answer to stream as it is generated, so that I see
   progress instead of a blank screen.
3. As a player, I want to see what the assistant is doing (parsing, searching,
   ranking), so that I understand the delay.
4. As a player, I want each suggestion to say why it matches, so that I can
   judge the recommendation.
5. As a player, I want the assistant to keep the conversation going, so that I
   can refine a request.
6. As a player, I want the assistant to say when nothing matches, so that I can
   broaden my request.
7. As a player, I want a clear error when the model or server fails mid-turn, so
   that I know what happened.
8. As a player, I want the turn saved, so that reopening the conversation shows
   the answer and the suggested cards.
9. As a developer, I want one seam covering the whole pipeline, so that I can
   test parse-through-persist in one integration test.
10. As a developer, I want the answer constrained to retrieved cards, so that
    hallucinated suggestions are impossible.

## Implementation Decisions

- Endpoint: `POST /api/conversations/:id/messages`, an SSE response. The body
  carries the user text plus optional per-turn overrides for language, model,
  and edited filters.
- SSE events, in order: `turn.start`, `status`, `filters`, `cards`,
  `answer.delta` (repeated), `answer.end`, `turn.end`. An `error` event may
  occur at any point. `turn.end` carries the persisted message id.
- `filters` is emitted before retrieval so the UI can render the parsed chips
  mid-flight. `cards` is emitted before the answer so the grid can paint while
  the prose streams.
- Stage 2 ranks and selects from the candidates and streams a grounded
  explanation. The explanation may only reference retrieved cards; the prompt
  and the candidate payload enforce this.
- One user-selected model drives both stages. The per-turn model override wins
  over the conversation default, which wins over the configured default.
- On completion, the turn is persisted: the user message, the assistant message
  with its content, `filters_json`, and `card_ids_json`.
- If parsing degrades to free text only, a `status` event says so; if retrieval
  returns nothing, the answer states it and `cards` is empty.
- Orchestration, the Ollama client, and the repositories are resolved at the
  composition root, so tests substitute fakes.

## Testing Decisions

- Good tests assert the streamed event sequence and the persisted rows for a
  given prompt against a fake Ollama and a seeded index. They do not assert
  internal call order or prompt text.
- The integration test drives the Hono app's `request()` and reads the SSE
  stream, asserting: `turn.start` first, `filters` before `cards`, `cards`
  before the first `answer.delta`, `answer.end` before `turn.end`, and the
  message id in `turn.end` matching the persisted assistant message.
- Cases: a normal turn; a turn with edited filters passed in the body; a turn
  where parsing degrades to free text only; a turn where retrieval returns
  nothing; a turn where the model errors midway, which must emit `error` and not
  persist a partial assistant message as complete.
- Reopening the conversation afterwards must show the stored filters and card
  ids.

## Out of Scope

- The client that consumes the stream (feature 08).
- Filter chip editing and model selection UI (feature 09), though the request
  overrides exist here.
- Multi-stage or agentic tool use beyond the two-stage pipeline.

## Further Notes

- The SSE contract lives in `packages/contracts` so the client validates events
  as they arrive.
- Partial assistant content on error is discarded rather than persisted, so a
  failed turn never leaves a half-answer in history.

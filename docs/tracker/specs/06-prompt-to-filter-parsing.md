# 06 - Prompt-to-filter parsing

- **Status:** `ready-for-agent`
- **Kind:** spec
- **Blocked by:** 01, 02
- **Source:** architecture grilling, 2026-09-15

## Problem Statement

Players describe what they want in prose ("a light monster that banishes
cards"). Retrieval needs structured filters plus a free-text query. Small local
models vary in how reliably they emit structured output, so the parsing step
must produce valid, validated filters even on models that do not support
constrained output.

## Solution

A stage-1 parser in `packages/rag` that turns a natural-language request into
validated filters and a free-text query. It uses Ollama structured outputs when
the selected model supports them, and degrades to JSON-mode prompting with a Zod
parse and one repair retry otherwise. The output schema is shared from
`packages/cards` and `packages/contracts`.

## User Stories

1. As a player, I want my plain-language request understood, so that I do not
   have to translate it into field filters.
2. As a player, I want the parsing to work even when the model is small, so that
   I am not forced onto a heavy model.
3. As a player, I want a conservative parse rather than a wrong one, so that a
   vague request still retrieves something reasonable.
4. As a developer, I want the model response constrained by a schema where
   possible, so that parsing failures are rare.
5. As a developer, I want a defined fallback with a single repair retry, so that
   unsupported models still work predictably.
6. As a developer, I want the parsed result validated with Zod before use, so
   that retrieval never receives a malformed filter.
7. As a developer, I want to test parsing without a live model, so that parsing
   tests are deterministic.

## Implementation Decisions

- The parser is a pure function over a model response producer, so it can be
  tested with a stubbed model.
- Output shape: a list of filters over the fields and operators defined by the
  card filter schema, plus one free-text query string. Both are optional; an
  empty result is valid (pure semantic search).
- When the selected model supports structured output, the JSON schema is derived
  from the Zod filter schema and passed in Ollama's `format` parameter, with
  temperature 0.
- When it does not, the parser prompts for JSON only, parses with Zod, and on
  failure performs exactly one repair retry that includes the validation error.
- If the repair also fails, the turn proceeds with the free-text query only
  rather than erroring.
- The prompt includes the enumerated filter fields and operators generated from
  the schema, so it stays in sync with the domain.
- The parser never calls Ollama directly; it receives the client interface from
  the composition root.

## Testing Decisions

- Good tests assert the parsed filters and query for a given prompt and stubbed
  model response. They do not assert the exact prompt string.
- Cases: a structured-output model returning valid filters; a model returning
  filters plus free text; a model returning an empty result; a JSON-mode model
  returning invalid JSON once then valid on the repair retry; a model returning
  invalid JSON twice, which must fall back to free-text only.
- The model is stubbed; no test requires Ollama.

## Out of Scope

- Executing the parsed filters (feature 04).
- Generating the final answer (feature 07).
- Presenting or editing the parsed filters (feature 09).

## Further Notes

- The "proceed with free text only" failure mode is deliberate: a degraded
  search beats an error page. Feature 07 surfaces this as a status event.

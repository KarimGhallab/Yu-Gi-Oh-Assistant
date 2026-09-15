# 09 - Transparent controls

- **Status:** `ready-for-agent`
- **Kind:** spec
- **Blocked by:** 08
- **Source:** architecture grilling, 2026-09-15

## Problem Statement

The assistant parses prose and picks a model, but the player cannot see or
correct either. A wrong parse is invisible, there is no way to ask in another
language, and the model is fixed. That turns a demo into a black box and makes
retrieval quality hard to judge.

## Solution

Three controls layered onto the chat: editable filter chips that show and
correct the parse and re-run the turn, a language selector that switches between
English and French cards, and a model picker that lists available Ollama models
and persists the choice per conversation.

## User Stories

1. As a player, I want to see the structured filters derived from my request, so
   that I can tell whether it understood me.
2. As a player, I want to edit those filters and re-run, so that I can correct a
   wrong parse without retyping.
3. As a player, I want to remove a filter chip, so that I can broaden a result.
4. As a player, I want to add a filter from the supported fields, so that I can
   constrain a result.
5. As a player, I want to switch between English and French cards, so that I can
   play in my language.
6. As a player, I want the assistant to answer in the language I selected, so
   that names and effects match the cards I own.
7. As a player, I want cards that exist in only one language to still appear
   with a marker, so that I am not silently missing options.
8. As a player, I want to choose which local model answers, so that I can trade
   speed for quality.
9. As a player, I want to see which models are available, so that I pick one
   that is installed.
10. As a player, I want the chosen model and language remembered per
    conversation, so that reopening restores them.
11. As a developer, I want a model's structured-output capability surfaced, so
    that choosing a weak model is an informed choice.

## Implementation Decisions

- The `filters` SSE event drives the chips. Each chip is one filter; the chips
  are editable and removable, and new filters can be added from the supported
  fields and operators.
- Submitting a turn with edited chips sends them in the request body as
  overrides; the server uses them instead of re-parsing.
- The language selector is a conversation attribute (default English),
  changeable per turn. Switching re-runs retrieval for the current query in the
  new language. The client sends the active language with each turn.
- Cards missing in the active language still appear, with an EN-only or FR-only
  marker. The card name and effect render in the active language.
- The model picker lists models from `GET /api/models` and flags structured
  output support. The selection is persisted on the conversation and sent as a
  per-turn override.
- The chips, language selector, and model picker all live in the chat view and
  share the turn submission path from feature 08.

## Testing Decisions

- Good tests assert user-visible behavior: editing a chip and re-running
  produces a new turn with the edited filter, switching language changes the
  cards, and picking a model persists.
- React Testing Library covers the chips editor (add, edit, remove), the
  language selector, the model picker, and the one-language marker. The network
  is faked at the `fetch` and `EventSource` boundary.
- Integration tests through the server seam assert that edited filters in the
  request body are honored and that a language or model override is persisted on
  the conversation.
- Playwright extends the feature 08 flow: edit a chip, re-run, and assert the
  new filters echoed by the server.

## Out of Scope

- Automatic language detection.
- Translating effects between languages; the card text comes from the dataset in
  its original language.
- Model-specific tuning beyond choosing the model.

## Further Notes

- Cross-language markers are presentation only; retrieval never mixes languages
  within a turn.
- The chips must remain usable when a turn degrades to free text only; in that
  case the chips area shows the free-text query and no structured filters.

# 08 - Chat client

- **Status:** `ready-for-agent`
- **Kind:** spec
- **Blocked by:** 07
- **Source:** architecture grilling, 2026-09-15

## Problem Statement

The server can answer, but there is no interface. A player cannot type a
request, watch an answer stream, or see suggested cards. The previous prototype
was a command-line script with no UI at all.

## Solution

A React client in `apps/web` that provides the chat experience: a streaming
conversation view, a card grid with images, and a conversation sidebar to list,
open, and manage conversations. The server is authoritative; the client caches
its state and consumes the turn stream.

## User Stories

1. As a player, I want to type a request and submit it, so that I get
   suggestions.
2. As a player, I want to watch the answer stream, so that I see progress.
3. As a player, I want the suggested cards shown as a grid with images, so that
   I recognize them at a glance.
4. As a player, I want each card to link to its source, so that I can verify it.
5. As a player, I want to see the assistant's status during a turn, so that I
   know it is working.
6. As a player, I want the assistant to say when nothing matches, so that I can
   broaden my request.
7. As a player, I want a list of past conversations in a sidebar, so that I can
   reopen one.
8. As a player, I want to open a conversation from a URL, so that I can
   bookmark or refresh it.
9. As a player, I want to start a new conversation, so that I can switch topics.
10. As a player, I want a clear error banner when a turn fails, so that I know
    what went wrong.
11. As a player, I want the empty state to suggest example prompts, so that I
    know what the assistant can do.
12. As a keyboard or screen reader user, I want the chat and controls operable
    and announced, so that the app is usable without a mouse.
13. As a returning user, I want a conversation to reload with its messages and
    suggested cards, so that I can continue.

## Implementation Decisions

- React 19 with Vite 8 and TypeScript. Tailwind for styling.
- `react-router` with a conversation route (`/c/:id`) so conversations are
  linkable and refreshable.
- TanStack Query for server-state (conversation list, conversation detail,
  models). A dedicated hook consumes the turn SSE stream and appends into the
  message cache.
- The chat view renders: the message history, the streamed assistant answer, a
  status line during a turn, and the card grid for the turn.
- Suggested cards render with hotlinked images, the card name, and a link to the
  source; the grid is the same for stored turns and live turns.
- A conversation sidebar lists conversations, offers new, rename, and delete,
  and highlights the active one.
- The client validates streamed events with the schemas from
  `packages/contracts`.
- No authoritative client-side conversation store; TanStack Query cache plus the
  server.
- First slice only: the filter chips, language selector, and model selector are
  feature 09. This feature renders whatever filters and cards the server sends,
  without editing controls.

## Testing Decisions

- Good tests assert rendered output and user-visible behavior, not component
  internals or hook state.
- React Testing Library covers: submitting a request, the streamed answer
  appearing incrementally, the card grid rendering, the empty state, the error
  banner, and the conversation sidebar actions. The network is faked at the
  `fetch` and `EventSource` boundary.
- Playwright covers the full flow against the built app and a fake Ollama HTTP
  server: submit a prompt, assert a turn streams, chips render, and cards
  appear; reload a conversation and assert it restores.
- Prior art: none in-repo; this is the first client code.

## Out of Scope

- Editing filters, switching language, and picking a model (feature 09).
- Deck building, collections, and any account UI.
- Hosting or deployment of the client (feature 10 packaging).

## Further Notes

- Accessibility is part of the first slice: the streamed answer region is a
  live region, controls are keyboard reachable, and the turn has a visible
  focus order.
- The SSE hook must handle reconnection-less streams cleanly: on `turn.end` or
  `error`, close and refresh the conversation query.

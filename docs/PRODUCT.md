# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The maintainer, on their own machine, thinking about a Yu-Gi-Oh deck. They arrive
mid-thought rather than mid-task, usually while assembling or adjusting a deck,
and they want plausible cards quickly enough to keep thinking.

A second audience reads the repository: developers and recruiters following the
portfolio link. They do not so much use the app as inspect it, so what the
repository claims about itself has to hold up.

## Product Purpose

Turn a short natural language request into a shortlist of Yu-Gi-Oh cards worth
considering, drawn from a catalog indexed on the same machine, with an answer
written from those cards. Success is a shortlist the player can act on within
minutes of asking, and a repository that reads as deliberate engineering.

## Positioning

It answers only from a real indexed catalog of 25,895 card entries in English and
French, so it cannot invent a card. Nothing leaves the machine: the models are
local, the conversations are local, and there is no account to hold them. And it
runs against whichever models the player already has in Ollama rather than a
vendor's endpoint. A neighbouring assistant could not truthfully claim all three
at once.

## Operating Context

- Runs locally through pnpm scripts (dev, build, start), with Node 26.5.0 and
  pnpm 12.4.2 pinned by mise.
- Needs an Ollama instance, local or on the network, with a chat model and an
  embedding model pulled into it.
- Needs a populated local index, built once from the YGOPRODeck dump by a
  command; neither the index nor the dump is in the repository.
- The server binds to loopback by default and is unauthenticated: the
  conversation history is private because it is unreachable, not because it is
  protected.
- Work is tracked as specs and tickets under `docs/tracker`, and the product and
  architecture vocabulary lives in the domain docs.
- Verification against the real stack, meaning a populated index and a reachable
  model, is a normal part of landing a ticket rather than an optional extra.

## Capabilities and Constraints

Confirmed today:

- A conversation holds turns. A turn parses the request into structured filters,
  retrieves candidate cards from the local index, and streams an answer written
  from the cards it retrieved.
- Retrieval combines structured filters with free text ranking, scoped to one
  language at a time, over 25,895 card entries in English and French.
- Conversations are stored locally in SQLite and reopen with their messages, the
  filters each turn was searched with, and the cards each turn suggested.
- A request can name the language and the model to use, and a conversation
  remembers what it was last told.
- The client shows what a request was understood as in a readout under it, lets
  the player correct a filter or add one and re-run the turn, switches the
  conversation's language, and picks the model from those installed in Ollama.
- Terminology, normative for docs and code: a request is what the player asks, a
  turn is one exchange, filters are the structured constraints parsed from a
  request, suggested cards are the candidates a turn retrieved, and a grounded
  answer is one written only from those cards.

Constraints:

- Single user, no accounts, no authentication, no telemetry.
- No deck building, no collection tracking, no decklists, and no hosting of the
  client, in the current specs.
- Card data comes from the YGOPRODeck dump and is bilingual. Adding a language
  means rebuilding the index, not translating an answer.
- The interface's visual direction is recorded in `docs/DESIGN.md`.

Open decision: where the app is hosted, if anywhere. The repository is public; a
live instance is not.

## Brand Commitments

- The name is Yu-Gi-Oh Assistant. It references a third party's property, and the
  repository makes no commercial, licensing, or affiliation claim; future work
  must not invent one.
- No voice, tone, logo, or identity system has been established.

## Evidence on Hand

- A working local stack, a Hono server and a React client over a LanceDB index
  and a SQLite store, verified live against a populated index.
- A real populated index of 25,895 card entries across English and French, built
  from the YGOPRODeck dump.
- The decision record: feature specs, tickets, and their Outcomes under
  `docs/tracker`, plus the domain docs.
- Absent, and not to be fabricated: logo, imagery, committed screenshots,
  testimonials, user counts, benchmarks, or pricing.

## Product Principles

1. Suggestions come from the catalog. If the index does not hold a card, the
   product does not mention it.
2. Nothing leaves the machine. No cloud model, no account, no telemetry, and no
   conversation leaving loopback without a deliberate decision.
3. A vague idea and a precise constraint are both first class. A theme, a
   half-remembered card, a slot to fill, and support for a card already run all
   deserve a shortlist.
4. Claims are checkable. Every suggested card links to its source, and the
   repository only claims what it demonstrates.

## Accessibility & Inclusion

- Operating the chat without a mouse is a requirement rather than a nicety:
  controls are keyboard reachable, focus is visible, and streamed answers are
  announced.
- The catalog is English and French, and a turn never mixes languages. A card
  missing from the active language surfaces from the other one rather than
  disappearing.

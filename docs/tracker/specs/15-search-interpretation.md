# 15 - Search interpretation

- **Status:** Resolved (2026-09-18)
- **Kind:** spec
- **Blocked by:** 05, 07, 13
- **Source:** architecture review, 2026-09-18

## Problem Statement

A reopened conversation cannot say how its search was understood. The store
keeps the filters on the assistant's reply and the rewrite on the player's
message, and it keeps the status nowhere. The readout therefore rebuilds the
interpretation from the last message that has filters, so a turn that fell back
to the player's own words reads "No filters" once the conversation is opened
again, even though the turn reported `free-text-only` while it ran. A reader has
to know which message holds which part, and the client carries a second, live
copy of the same record that never agrees with the stored one.

## Solution

Make the turn's search interpretation one record, owned by the reply. It holds
the filters that were understood, the free text the search ran on, and the
status the turn reported; the reply stores it, the contract exposes it nested on
the message, and the readout reads it, live or stored, instead of rebuilding it.
The player's message stops carrying the rewrite as its own field, and the
"Searched as" line pairs a request with its reply's record to keep showing it
beside the request.

## User Stories

1. As a player, I want a reopened conversation to show how its search was
   understood, so the readout is the same when I come back as it was while the
   turn ran.
2. As a player, I want a turn that searched my own words to still say so after a
   reload, so I know the request was not turned into filters.
3. As a player, I want the rewrite to keep showing beside the request, so I can
   see what my words became.
4. As a player, I want the filters and the status to be one thing, so the
   readout never shows a status that contradicts the chips.
5. As a player, I want a turn that failed to leave the question and no search,
   so the history stays honest.
6. As a developer, I want one record for the interpretation, so the store, the
   server, and the client name the same facts.
7. As a developer, I want the contract to own the record's shape, so the client
   and the server cannot drift.
8. As a developer, I want the store to validate the filters and carry the status
   code, so it does not learn the turn's vocabulary.
9. As a developer, I want the reply written in one append, so there is no second
   write and no partially written interpretation.
10. As a developer, I want `setQuery` gone, so the store's interface is
    narrower.
11. As a developer, I want the migration to say plainly that stored turns are
    not carried, so a rebuilt store is expected rather than surprising.
12. As a developer, I want the live and reopened readouts built from one shape,
    so a change to the record is one change.
13. As a developer, I want the "Searched as" pairing to be one named step, so
    the request-to-reply relationship lives in one place.
14. As a maintainer, I want no change to the stream frames, so the e2e suite and
    the reporter stay as they are.

## Implementation Decisions

- **The record.** `packages/contracts` owns `SearchInterpretation`: the filters,
  an optional query, and an optional status. It is nested on the message
  contract as `search?`, and the top-level `filters` and `query` leave the
  message contract. `cards` stays a message field of its own.

  ```ts
  export const searchInterpretationSchema = z.object({
    filters: cardFiltersSchema,
    query: z.string().min(1).optional(),
    status: z.enum(TurnStatus).optional()
  });
  ```

- **The store.** `packages/db` keeps one `search_json` column on `messages`. Its
  `Message` carries an optional `search` of the filters, the query, and the
  status: the repository validates `filters` with the cards schema and carries
  the status code and the query as strings. `AppendMessageInput` gains `search`,
  and `IMessageRepository.setQuery` is removed.
- **Writing the turn.** `runTurn` holds the search the pipeline reported and
  appends it with the reply, in the same `append` that writes the answer and the
  card ids. `storeQuery` is removed. A turn that fails before the reply is stored
  keeps the question and no search.
- **Reading it back.** `projectMessages` is where the stored record becomes the
  wire record; the route's existing contract validation is what pins the status
  code to `TurnStatus`. The readout's stored path reads the last message that has
  a `search`, replacing `lastSearch`.
- **The live path.** `useTurn` assembles the same `SearchInterpretation` from the
  `status` frame and the `filters` frame, and stops keeping a second named shape
  of its own.
- **"Searched as".** The client pairs each player message with the following
  reply's `search.query` while it builds the turn list, so the rewrite keeps
  rendering under the request. The pairing is one named step.
- **The stream.** Unchanged: `status` then `filters`, as ADR-0006 names them.
- **The migration.** One migration drops and recreates `messages` with
  `search_json` and without `filters_json` and `query`, empty, with a comment
  that stored turns are not carried. A fresh data dir is the accepted cost.
- **The record of the decision.** ADR-0006 is amended to hold it: the
  interpretation is one record owned by the reply, and the stream stays two
  frames.

## Testing Decisions

- The tests cross the seam a caller crosses: the store through `IAppStore`, the
  route through its HTTP response, and the readout through the app.
- `MessageRepository.test.ts` gains a round trip for the search record: the
  filters, the query, and the status survive append and read, and a row whose
  `search_json` no longer satisfies the filter schema is raised.
- `runTurn.test.ts` asserts the reply stores the record the pipeline reported,
  and that a turn that fails stores no search.
- `conversationRoutes.test.ts` asserts a stored free-text turn answers with the
  search record intact, which is the reopened readout at the HTTP seam.
- The client tests (`App.turn.test.tsx`, `App.filters.test.tsx`) assert the
  readout shows "Searched as written" after a reload of a free-text turn, and
  that "Searched as" still shows the rewrite under the request.
- Prior art: the ports-and-adapters store tests and the app-level turn tests the
  client already uses.

## Out of Scope

- Folding the `status` and `filters` frames into one `search` frame.
- Storing a turn as its own record, or exposing turns rather than messages.
- Backfilling existing turns; the store is rebuilt and a fresh data dir is
  expected.
- Any change to parsing, retrieval, selection, or the answer.
- Any change to the readout's editing controls.

## Further Notes

- ADR-0006 is amended rather than joined by a new ADR, because this sharpens the
  stored turn the ADR already describes.
- `docs/GLOSSARY.md` changes: the Rewrite entry now records that the turn's
  search holds it, and the Interpretation entry says it is one record stored
  with the reply.
- No new domain term: `SearchInterpretation` and Rewrite already exist.
- The migration empties `messages`; the conversations remain, with no turns in
  them.

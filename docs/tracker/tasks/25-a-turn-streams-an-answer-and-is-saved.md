# 25 - A turn streams an answer and is saved

**What to build:** A player sends a request in a conversation and gets a reply
built from the cards the search actually found. The parse streams first, so the
search that was understood is visible, the suggested cards follow, and the answer
arrives as it is written rather than all at once. Reopening the conversation
shows the question, the answer, and the same cards. From a developer's
perspective: one endpoint that runs the whole pipeline, streams typed events, and
stores the turn, which is the seam every later feature tests through.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-16)

- [x] Posting a request to a conversation answers with a stream carrying, in
      order, `turn.start`, `filters`, `cards`, one or more `answer.delta`,
      `answer.end`, and `turn.end`.
- [x] The `filters` event carries the filters the parse found and the free text
      the parse kept, so the search can be rendered as it runs.
- [x] The `cards` event carries the highest ranked candidates, limited to the
      number the configuration says to show, chosen before the answer begins.
- [x] The answer is written from the shown cards and nothing else, so it cannot
      suggest a card the search did not return.
- [x] `turn.end` carries the id of the stored assistant message.
- [x] The turn is stored: the player's message, and the assistant message with
      its content, its filters, and the shown card ids. Reopening the
      conversation returns the same turn, cards included.
- [x] Every streamed event is validated through the contracts package, and the
      card shape on the wire comes from the card domain rather than being
      restated on the wire.
- [x] The turn reads the selected model's structured-output capability and uses
      it for the parse, taking the conversation's model when the request names
      none.
- [x] Integration tests drive the app's `request()` with a fake model and a
      seeded index: they assert the event order, that `turn.start` comes first,
      that the cards precede the first answer delta, and that the stored rows
      carry the filters and the card ids. They do not assert prompt text, and
      they need no live Ollama.
- [x] Build and lint pass.

**Notes:** The suggested cards are the highest ranked candidates limited to the
configured number shown, chosen by the pipeline before the answer starts, which
is what lets the cards event precede the first answer delta and lets the answer
stage explain exactly those cards. The card shape on the wire belongs to the card
domain, which gains the schema its interface describes, because the wire package
may only import the card domain and the shared helpers, and the client must not
restate what a card is.

The player's message is written when the turn starts rather than at the end: it
is what names an untitled conversation, and it is what survives a turn that fails
(ticket 27). The assistant message is written only when the answer completes.

The answer stage is given the request and the shown cards, and no history yet, so
a follow-up that depends on an earlier turn ("cheaper ones") is not understood.
Refining across turns is its own slice rather than part of this spec, which never
tests it. Both stages run at temperature 0. The selected model's capability is
looked up per turn; the models endpoint feature 09 needs, and any caching of that
lookup, belong there.

**Outcome:** The turn exists end to end. Contracts gained the request body and a
discriminated union of six events, the answer stage joined retrieval and parsing
in `packages/rag`, the card shape moved into the card domain where its interface
already described it, and the server gained a pipeline that yields those events
and an SSE route that frames each one after validating it.

Two placements were forced rather than chosen. The pipeline lives in the server
because `rag` may not import contracts, so it could not yield a wire event. And
the events carry their name twice, as the SSE frame and as a `type` in the
payload, so a client can validate a frame and act on it without trusting the
transport.

The turn stores the player's message before the stream opens, which is what makes
an unknown conversation a plain 404 and gives `turn.start` an id for the client to
reconcile, and it stores the answer once, when the answer is complete, with the
effective filters and the shown card ids. The `filters` event reports the search
that is actually about to run rather than the raw parse, so a request the model
could not parse but whose words were searched anyway renders as the search it was.
An answer that comes back empty throws instead of storing an empty reply, which
is ticket 27's failure to handle, and a model that is not installed parses
unconstrained, which is ticket 28's to refuse. The empty search is answered from a
fixed English constant without a model call: a turn must do something coherent
with no candidates, and the constant is not localized because that copy is a
product decision rather than something to leave to a model.

The answer stage is told the language by name rather than left to infer it from
the request. That came out of the live run: the first turn came back in Thai, and
naming the language fixed it.

Verified live against the server in `apps/server/.env` and the real 25,895-card
index: `turn.start` at 13 ms, `filters` at 11.2 s with the level and attribute
filters the request named, `cards` at 12.2 s with eight banish-themed cards,
the answer streaming from 13.3 s, and `turn.end` at 24.2 s. Reopening the
conversation returned the player's message and the answer with its filters and
its eight card ids. Retrieval is the fast part; the two model calls are the wait.

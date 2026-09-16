# 25 - A turn streams an answer and is saved

**What to build:** A player sends a request in a conversation and gets a reply
built from the cards the search actually found. The parse streams first, so the
search that was understood is visible, the suggested cards follow, and the answer
arrives as it is written rather than all at once. Reopening the conversation
shows the question, the answer, and the same cards. From a developer's
perspective: one endpoint that runs the whole pipeline, streams typed events, and
stores the turn, which is the seam every later feature tests through.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] Posting a request to a conversation answers with a stream carrying, in
      order, `turn.start`, `filters`, `cards`, one or more `answer.delta`,
      `answer.end`, and `turn.end`.
- [ ] The `filters` event carries the filters the parse found and the free text
      the parse kept, so the search can be rendered as it runs.
- [ ] The `cards` event carries the highest ranked candidates, limited to the
      number the configuration says to show, chosen before the answer begins.
- [ ] The answer is written from the shown cards and nothing else, so it cannot
      suggest a card the search did not return.
- [ ] `turn.end` carries the id of the stored assistant message.
- [ ] The turn is stored: the player's message, and the assistant message with
      its content, its filters, and the shown card ids. Reopening the
      conversation returns the same turn, cards included.
- [ ] Every streamed event is validated through the contracts package, and the
      card shape on the wire comes from the card domain rather than being
      restated on the wire.
- [ ] The turn reads the selected model's structured-output capability and uses
      it for the parse, taking the conversation's model when the request names
      none.
- [ ] Integration tests drive the app's `request()` with a fake model and a
      seeded index: they assert the event order, that `turn.start` comes first,
      that the cards precede the first answer delta, and that the stored rows
      carry the filters and the card ids. They do not assert prompt text, and
      they need no live Ollama.
- [ ] Build and lint pass.

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

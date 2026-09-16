# 33 - The client streams a turn

**What to build:** A player types a request and watches the assistant work. Their
message appears at once, the turn announces itself while it runs, including when
the server says it understood nothing structured and searched their own words,
the suggested cards appear as the server reports them, and the answer arrives as
it is written rather than all at once. When the turn ends, what remains is the
stored reply with its cards. When it fails, a banner says which part failed and
no half-written reply is left behind.

**Blocked by:** 32 - A conversation reopens with its history.

**Status:** ready-for-agent

- [ ] Submitting a request shows the player's message immediately, and the
      message the server confirms replaces it rather than appearing twice.
- [ ] The turn is announced while it runs, and the announcement says when the
      search fell back to the player's own words.
- [ ] The suggested cards appear as the turn reports them, and the answer
      appears as it is written.
- [ ] The answer being written is announced to assistive technology, without
      rereading the whole conversation on every piece.
- [ ] When the turn ends, the conversation is refetched, so the stored turn, its
      cards, and any title it gave the conversation are what a reload would
      show.
- [ ] A turn that fails shows a banner naming the stage that failed, the
      half-written answer disappears, and the question stays.
- [ ] A request the server refuses before the stream starts, whether a missing
      conversation, a model that is not installed, or an unreachable Ollama,
      surfaces the server's own message the same way.
- [ ] A turn that found no cards shows the answer and no empty grid.
- [ ] A second turn cannot be started while one is running, and the composer
      says so.
- [ ] Tests fake the network at the fetch boundary with a scripted stream and
      assert the answer appearing in pieces, the cards appearing, the status
      announcement, the error banner with no leftover reply, and the refetch
      when the turn ends.
- [ ] Build and lint pass.

**Notes:** The turn is a POST, so `EventSource` cannot send it, and the
transport's own error event shares a name with one of the turn's frames; read the
response body with a stream reader and validate each frame against the contracts
package, treating the frame name as data rather than as transport. The live turn
renders through the same conversation cache entry the read path uses, so the
message list and the card grid have one shape, and the refetch on the turn
ending or failing is what keeps the server authoritative. Frames the client does
not render yet, such as the filters the parse found, are still validated and
ignored, because showing them is feature 09. The copy for the statuses and the
failed stages is the client's to write, in English.

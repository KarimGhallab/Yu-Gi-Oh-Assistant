# 77 - A search that found nothing names what to relax

**What to build:** A turn whose search returns no cards answers with a sentence
that names the fields the search ran with and invites removing one from the
readout, and says so when the search ran on the player's words alone. The
sentence is written for each language the catalog is indexed in and is fed by
the turn's search rather than improvised by a model. The turn's interpretation
is rendered with the answer in the history, so the empty result shows what was
searched rather than reading as a dead end.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] A no-result turn answers with a sentence naming the fields the search ran
      with.
- [ ] A no-result search that ran on the player's words alone says so.
- [ ] Each indexed language has its own sentence, written rather than translated.
- [ ] The sentence points at the readout's controls for removing a filter.
- [ ] The no-result turn's interpretation is rendered with the answer in the
      history, using the readout's own vocabulary.
- [ ] Tests at the pipeline seam prove the sentence names the fields, that the
      words-alone case says so, and that each language has its own sentence.
- [ ] A client test proves the filters are shown with a no-result answer.

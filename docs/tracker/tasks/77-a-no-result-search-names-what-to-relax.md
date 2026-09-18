# 77 - A search that found nothing names what to relax

**What to build:** A turn whose search returns no cards answers with a sentence
that names the fields the search ran with and invites removing one from the
readout, and says so when the search ran on the player's words alone. The
sentence is written for each language the catalog is indexed in and is fed by
the turn's search rather than improvised by a model. The turn's interpretation
is rendered with the answer in the history, so the empty result shows what was
searched rather than reading as a dead end.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] A no-result turn answers with a sentence naming the fields the search ran
      with.
- [x] A no-result search that ran on the player's words alone says so.
- [x] Each indexed language has its own sentence, written rather than translated.
- [x] The sentence points at the readout's controls for removing a filter.
- [x] The no-result turn's interpretation is rendered with the answer in the
      history, using the readout's own vocabulary.
- [x] Tests at the pipeline seam prove the sentence names the fields, that the
      words-alone case says so, and that each language has its own sentence.
- [x] A client test proves the filters are shown with a no-result answer.

**Outcome:** The no-result answer is now written from the turn's search.
`answerDeltas` takes the search's filters and, per language, names the fields
that constrained it and points at the readout below; a search that ran on the
player's words alone says so. The field labels live with the copy in English and
French, and a field is named once however many filters ask about it. The client
renders a no-result answer's interpretation under the prose in the readout's own
vocabulary: the field in Dust Grey and what it asked in Ash Grey, as a record
rather than a control, because the controls that remove a filter are the
readout's. An answer with cards shows no such line.

Tests prove the sentence names every field, the words-alone case, and both
languages, at the pipeline and conversation-turn seams; a client test proves the
filters are shown with a stored no-result answer. Gates are green: 61 files and
551 tests, dependency-cruiser 220 modules and no violations, knip unchanged,
typecheck, lint, prettier, syncpack, the path check, and the build all pass.
`DESIGN.md` and `.impeccable/design.json` record the searched-with line under the
prose.

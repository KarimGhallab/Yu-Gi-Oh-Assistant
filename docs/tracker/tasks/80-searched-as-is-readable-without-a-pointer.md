# 80 - `Searched as` is readable without a pointer

**What to build:** A player can read what a search ran on without pointing at
it. The words a request was searched as are a line under the request, visible to
a keyboard or touch user as much as to a pointer, rather than being taken out of
the layout until hover.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] `Searched as` and the query it carries are in the layout without hover,
      focus, or any pointer interaction.
- [x] It keeps the readout's mono scale and the Dust Grey label beside the Ash
      Grey words.
- [x] `DESIGN.md`'s `Searched as` paragraph and `.impeccable/design.json` are
      updated to the always-shown rule.
- [x] A client test proves the line is readable with no pointer interaction.

**Outcome:** The `sr-only` and hover-reveal pair is gone. `Searched as` is a
`flex` line under the request for everyone, so a keyboard or touch user reads
what a search ran on without pointing at anything. The turn's `group` class went
with it, since nothing in a turn needs a hover group anymore. The label stays
Dust Grey (now the raised `ink-faint`) beside the Ash Grey words in the readout's
12px mono. The two tests that asserted the old `sr-only` behaviour now assert the
line is in the layout, and `DESIGN.md` and `.impeccable/design.json` carry the
rule.

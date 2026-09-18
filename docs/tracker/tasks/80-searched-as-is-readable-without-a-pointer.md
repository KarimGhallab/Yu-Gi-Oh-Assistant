# 80 - `Searched as` is readable without a pointer

**What to build:** A player can read what a search ran on without pointing at
it. The words a request was searched as are a line under the request, visible to
a keyboard or touch user as much as to a pointer, rather than being taken out of
the layout until hover.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] `Searched as` and the query it carries are in the layout without hover,
      focus, or any pointer interaction.
- [ ] It keeps the readout's mono scale and the Dust Grey label beside the Ash
      Grey words.
- [ ] `DESIGN.md`'s `Searched as` paragraph and `.impeccable/design.json` are
      updated to the always-shown rule.
- [ ] A client test proves the line is readable with no pointer interaction.

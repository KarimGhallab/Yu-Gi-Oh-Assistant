# 82 - The model control is readable and its rows explain themselves

**What to build:** A model row that cannot answer a turn still explains why in
readable text and reads as unavailable, and the chosen model's full name can be
read where it stands without opening the list.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] The disabled row drops the blanket reduced opacity for a legible muted
      treatment, so the note explaining the limitation is readable.
- [x] The row is still announced as unavailable and cannot be selected.
- [x] The setting trigger exposes the full chosen model name to pointer users
      without opening the list, while keeping its truncation.
- [x] A client test proves the disabled row's note and the full model name on
      the trigger.

**Outcome:** The row a model that cannot answer a turn is offered in keeps
`aria-disabled` and drops `opacity-50` for `text-neutral-500` (the raised
`ink-faint`), so its limitation note is readable while the row still reads as
unavailable. The row state is one small function, so the fill for the row in
force, the quiet treatment for the rest, and the muted treatment for a row that
cannot be taken cannot drift apart, and a disabled row carries no highlight,
because a highlight promises that pressing it acts. The trigger gained a `title`
of the chosen name, so the truncation stays in the layout and the whole name is
read where it stands. Tests prove the disabled row's note and inertness and the
full name on the trigger. `DESIGN.md` and `.impeccable/design.json` carry both
rules.

The trigger also gained an explicit `aria-label` of its label and value, which
fixes its accessible name to `Cards in English` and lets the chip editor's
readout controls be named the same way.

# 82 - The model control is readable and its rows explain themselves

**What to build:** A model row that cannot answer a turn still explains why in
readable text and reads as unavailable, and the chosen model's full name can be
read where it stands without opening the list.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] The disabled row drops the blanket reduced opacity for a legible muted
      treatment, so the note explaining the limitation is readable.
- [ ] The row is still announced as unavailable and cannot be selected.
- [ ] The setting trigger exposes the full chosen model name to pointer users
      without opening the list, while keeping its truncation.
- [ ] A client test proves the disabled row's note and the full model name on
      the trigger.

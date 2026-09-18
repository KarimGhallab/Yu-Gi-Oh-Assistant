# 81 - The dialog shows the region that took the room

**What to build:** A dialog that has taken the room shows which region now holds
the keyboard, whoever opened it, and still gives the keyboard back to the row
that asked.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] On open the dialog surface takes focus and shows the recorded focus ring,
      whether it was opened by pointer or by keyboard.
- [ ] The first control is one Tab away, and the existing focus trap is
      unchanged.
- [ ] Escape and a press in the room outside cancel the dialog, and focus
      returns to the row that asked.
- [ ] A client test proves the focus indication on open and the return on
      cancel.
- [ ] `DESIGN.md`'s dialog keyboard paragraph is updated.

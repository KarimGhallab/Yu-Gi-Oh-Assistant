# 81 - The dialog shows the region that took the room

**What to build:** A dialog that has taken the room shows which region now holds
the keyboard, whoever opened it, and still gives the keyboard back to the row
that asked.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] On open the dialog surface takes focus and shows the recorded focus ring,
      whether it was opened by pointer or by keyboard.
- [x] The first control is one Tab away, and the existing focus trap is
      unchanged.
- [x] Escape and a press in the room outside cancel the dialog, and focus
      returns to the row that asked.
- [x] A client test proves the focus indication on open and the return on
      cancel.
- [x] `DESIGN.md`'s dialog keyboard paragraph is updated.

**Outcome:** The dialog focuses its own surface on open and draws the system's
focus ring there, with `tabIndex={-1}` and the Halo Amber outline. The first
control is one Tab away. Shift+Tab from the surface, or from the first control,
wraps to the last, because the dialog is where the keyboard starts and nothing
tables before it; the forward trap is unchanged. Escape, a press outside, and the
return of focus to the asking row all stay. The tests that asserted focus landed
on the first control now assert the surface, the ring, and the one-Tab reach, and
`DESIGN.md` and `.impeccable/design.json` carry the rule.

A consequence worth noting: `Searched as` (ticket 80) becoming always-visible and
this focus change both touch the request area, but each landed on its own and the
suite stays green.

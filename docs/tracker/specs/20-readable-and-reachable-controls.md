# 20 - Readable and reachable controls

- **Status:** ready-for-agent
- **Kind:** spec
- **Blocked by:** None
- **Source:** design critique, 2026-09-18

## Problem Statement

The text that explains a search is the least legible text on screen. The 12px
machine facts (the readout's field names, `Searched as`, the missing-image note,
and the language marker) are set in Dust Grey, which measures below the 4.5:1
contrast minimum on the surfaces they sit on. Because the value is a
design-system token rather than a one-off, the fix belongs to the system.

Two controls are reachable but not usable by everyone. `Searched as` is taken
out of the layout and revealed only on pointer hover, so a keyboard or touch
user never sees what a search ran on. A dialog puts the keyboard on its first
control, but a dialog opened by pointer shows no visible focus, so the region
that just took the room is not indicated.

One state is illegible and one control is unknowable. A model that cannot answer
a turn is offered as a row at reduced opacity, which makes the note explaining
why it cannot be taken the hardest text in the row to read. And the chosen
model's name is the element that truncates first, so the answer to "who is
answering" cannot be read without opening the list.

## Solution

Make the machine facts readable on every surface they are used on, and prove it
by measurement rather than by eye. Render `Searched as` for everyone, keep the
dialog's active region visibly indicated, read a disabled row's reason, and let
the chosen model's full name be read where it stands.

## User Stories

1. As a user with low vision, I want the 12px facts to meet the contrast minimum,
   so I can read what a search was understood as.
2. As a user, I want the language marker and the missing-image note to be
   readable, so the small facts about a card are not the hardest to read.
3. As a keyboard user, I want to read what a search ran on without a mouse, so I
   can check the assistant's understanding.
4. As a touch user, I want to read what a search ran on at all, so the claim is
   checkable on a phone.
5. As a keyboard user, I want the dialog to show which region just took the
   room, so I know where the keyboard is.
6. As a user, I want a model that cannot answer a turn to still explain why, so I
   understand why the row cannot be taken.
7. As a user, I want to read the full name of the chosen model without opening
   the list, so I know who is answering.
8. As a screen-reader user, I want the dialog announced as the active region and
   the disabled row announced as unavailable, so I am told the same thing the
   screen shows.
9. As a maintainer, I want the contrast fix to be a system value, so it does not
   drift back one component at a time.
10. As a developer, I want a browser measurement of the fixed value, so the
    claim is checked rather than assumed.

## Implementation Decisions

- **The machine facts clear the minimum.** The 12px facts are set in a value
  that clears 4.5:1 on the darkest surface each is used on, Room Black, Bench
  Slate, and Rail Grey. The decision is either raising Dust Grey or setting
  12px facts in Ash Grey and keeping Dust Grey for larger or decorative uses;
  whichever is chosen is recorded in `DESIGN.md` so the whole system moves
  together. The result is measured in the browser on the surfaces the facts
  appear on.
- **`Searched as` is always shown.** It stops being `sr-only` and
  hover-revealed, and is rendered as a persistent 12px mono line under the
  request, so pointer, keyboard, and touch users all read it. `DESIGN.md`'s
  `Searched as` paragraph is updated to match.
- **The dialog indicates its region on open.** The dialog surface takes focus
  when the dialog opens and draws the system's focus ring on the surface, so the
  active region is visible whether the dialog was opened by pointer or by
  keyboard. The first control is one Tab away and the existing focus trap is
  unchanged. `DESIGN.md`'s dialog keyboard paragraph is updated.
- **A disabled row stays legible.** The model row that cannot answer a turn keeps
  `aria-disabled` and drops the blanket reduced opacity for a legible muted
  treatment, so the note explaining the limitation is readable while the row
  still reads as unavailable. The row cannot be selected, as today.
- **The chosen model's name can be read where it stands.** The setting trigger
  keeps its truncation but exposes the full chosen name to pointer users without
  opening the list. Assistive technology already reads the full name, which is
  preserved.
- **No contract change.** Every decision here is client-side or a design token.

## Testing Decisions

- Good tests assert what a player can see and reach through the whole client.
  The client seam is the existing `AppTest` harness. Prior art:
  `App.settings.test.tsx`, `App.conversationActions.test.tsx`, and the filter
  and readout suites.
- A test proves `Searched as` is in the document and readable without any hover
  or pointer interaction.
- A test proves a dialog takes focus on open with a visible focus treatment and
  returns focus to the row that asked on cancel.
- A test proves a model that cannot answer is announced as disabled and its note
  is present, and that selecting it does nothing.
- A test proves the setting trigger exposes the full model name.
- Contrast has no unit seam. It is proven with the bundled detector
  (`impeccable detect`) against the running app and a browser measurement of the
  fixed value on Room Black, Bench Slate, and Rail Grey, recorded in the run's
  report.

## Out of Scope

- The sidebar's animated width, which the design critique flagged and the
  maintainer chose to leave as committed.
- The turn-recovery and empty-bench work (spec 19) and the amber and chrome work
  (spec 21).
- Any change to the focus ring's token, which stays Halo Amber.

## Further Notes

- The 2026-09-18 design critique is stored under `.impeccable/critique/`.
- The contrast failure is a system value, not implementation drift; the fix
  updates `DESIGN.md`, not only the components.
- `DESIGN.md` is edited by spec 21 as well, in different sections.

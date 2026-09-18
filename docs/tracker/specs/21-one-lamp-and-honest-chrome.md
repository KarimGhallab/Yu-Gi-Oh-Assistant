# 21 - One lamp and honest chrome

- **Status:** ready-for-agent
- **Kind:** spec
- **Blocked by:** None
- **Source:** design critique, 2026-09-18

## Problem Statement

The One Lamp Rule says amber marks the action, the choice, and the focus, and
nothing else. The conversation screen breaks it: the sidebar's New control and
the composer's Send are both filled amber, so the screen a player spends their
time on burns two lamps at once. `DESIGN.md` records the conflict as undecided,
which means the system contradicts itself in the place that matters most.

The chrome also lies in one state. A conversation that holds no messages but has
a stored title shows that title in the header while the body offers the starting
prompt, so the page is named after something that has not happened. And with the
sidebar open, the header repeats the open row's words.

## Solution

Decide which control is the lamp of a screen and make the sidebar's New control
stop being a second one. Let an empty conversation speak for itself rather than
carry a title it has not earned, and settle the header repetition as intended
rather than leaving it as an open defect.

## User Stories

1. As a user, I want one obvious primary action per screen, so I am not choosing
   between two lamps.
2. As a user, I want the Send to read as the act of asking, so the control that
   runs my request is the one the screen lights.
3. As a user, I want starting a conversation to stay reachable without competing
   with the request I am about to send.
4. As a user, I want an empty conversation to look like the start it is, so I am
   not shown a title for nothing.
5. As a user, I want a conversation's title to appear once it has something to
   name, so the heading matches what is on the screen.
6. As a screen-reader user, I want the sidebar row and the page heading to be
   two distinct landmarks, so the repetition is not read as a duplicate.
7. As a maintainer, I want the One Lamp Rule's decision written in `DESIGN.md`,
   so the next screen does not reopen it.
8. As a developer, I want the empty-conversation state asserted, so the title
   rule does not regress.

## Implementation Decisions

- **Send is the lamp; New is a quiet action.** The composer's Send is the one
  filled amber control of the asking surface on both the home and conversation
  screens. The sidebar's New control drops its amber fill everywhere, becoming a
  quiet action with the plus mark, styled like the sidebar's other quiet
  controls. The folded rail's New mark is a mark like the conversation marks,
  not a fill. `DESIGN.md`'s One Lamp Rule is updated to record the decision and
  remove the sentence that leaves it undecided.
- **An empty conversation carries no title.** The conversation header is
  rendered only once the conversation holds at least one message. An empty
  conversation shows the prompt and the examples with the same composition as
  the home surface, without the header. The sidebar row keeps showing the
  conversation's name as it does today. `DESIGN.md`'s layout and empty-state
  notes are updated.
- **The header and the sidebar row are different things.** On a conversation
  with messages, the header is the page's heading and the sidebar row is
  navigation marked with `aria-current`; the repeated words are not a defect and
  no change is made. This is recorded so the finding is not reopened.
- **No behavior changes to starting or sending.** New still starts a
  conversation, the empty state still starts one from its request, and the
  footer still asks in the open one.

## Testing Decisions

- Good tests assert what a player sees through the whole client, at the existing
  `AppTest` seam. Prior art: `App.home.test.tsx` and `App.history.test.tsx`.
- A test proves that a conversation with no messages shows the home composition
  and no page title, and that adding a message brings the title in.
- A test proves the New control is present and named on both the home and the
  conversation screens, so removing its fill did not remove the way to start a
  conversation.
- The fill itself has no unit seam. It is verified with the bundled detector
  (`impeccable detect`) against the running app, a browser pass, and the updated
  `DESIGN.md`.

## Out of Scope

- The turn-recovery and empty-bench behavior (spec 19).
- Contrast, dialog focus, and the `Searched as` reveal (spec 20).
- Any change to the sidebar's animated width, which stays as committed.
- Redesigning the shell; the request is to keep it and let the workbench show
  through, which specs 19 and 20 carry.

## Further Notes

- The 2026-09-18 design critique is stored under `.impeccable/critique/`.
- `DESIGN.md` is edited by spec 20 as well, in different sections.

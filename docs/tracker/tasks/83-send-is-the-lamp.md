# 83 - Send is the lamp and an empty conversation carries no title

**What to build:** A conversation screen shows one obvious primary action, the
Send that asks the request, with the sidebar's New control as a quiet action
beside it rather than a second filled lamp. And a conversation with nothing in it
draws the bench instead of a header title it has not earned, so the page is not
named after something that has not happened.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] The composer's Send is the one filled amber control of the asking surface,
      on the home surface and in a conversation alike.
- [x] The sidebar's New control is a quiet action with the plus mark, named and
      reachable, and its folded form is a mark rather than a fill.
- [x] A conversation with no messages shows the bench and no header title; the
      sidebar still names it.
- [x] A conversation with at least one message shows its title in the header.
- [x] The header and the sidebar row are recorded as two distinct things on a
      spoken conversation, so the repetition is not treated as a defect.
- [x] `DESIGN.md` and `.impeccable/design.json` record the One Lamp decision and
      the header arriving with the first message.
- [x] Client tests prove the empty title and the New control on both surfaces.
- [x] The states are verified in a browser and with the bundled detector.

**Outcome:** The One Lamp Rule now names the lamp: Send, the act the asking
surface is for, is the single filled control, and the sidebar's New is a quiet
action with the plus, in its header and folded forms alike. The conversation
header renders only once the conversation holds a message, so an empty
conversation draws the shared bench and its own title, and the sidebar is what
identifies it until then; a conversation with history keeps its header title,
and that title and the sidebar row are the page heading and navigation rather
than a duplication. `DESIGN.md` and `.impeccable/design.json` carry both
decisions.

Tests that had asserted a title on an empty conversation now assert the bench and
the absence of that title, and the tests whose subject is the sidebar or a
conversation's history now give the conversation a stored turn so the header
exists. The suite is green, the detector reports only the committed sidebar width
transition and the two known false positives, and the states were verified at
1440 wide for an empty and a spoken conversation.

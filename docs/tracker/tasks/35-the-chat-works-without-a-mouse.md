# 35 - The chat works without a mouse

**What to build:** The whole flow, verified and fixed for a player who uses a
keyboard or a screen reader: starting a conversation, moving between
conversations, asking a question, watching it answer, reading the cards it
suggested, and renaming or deleting a conversation.

**Blocked by:** 33 - The client streams a turn; 34 - Rename and delete a
conversation from the sidebar.

**Status:** ready-for-agent

- [ ] Every control in the app can be reached, activated, and understood from
      the keyboard alone, in an order that follows what is on the screen.
- [ ] Focus is always visible, and it lands somewhere sensible after each
      action, including when a turn finishes.
- [ ] The turn's progress, its answer as it is written, and its failures are
      announced to assistive technology, without repeating the rest of the
      conversation.
- [ ] Cards, images, controls, and the conversation list carry the labels and
      roles that make them readable as what they are.
- [ ] The pass is recorded: what was walked through, what was wrong, and what
      was fixed.
- [ ] Tests cover the keyboard path through the flow, not only the pointer one.
- [ ] Build and lint pass.

**Notes:** This is the last slice of the feature and the one that checks the
accessibility criteria the earlier tickets carry, so a finding here is a fix
rather than a note for later. Walk the keyboard path against the running app;
where something can only be seen with a screen reader, record what was checked
and how. A dedicated audit tool would be an install the maintainer has to run, so
ask before adding one.

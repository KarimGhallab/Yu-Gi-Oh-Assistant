# 44 - The player picks the model

**What to build:** The chat view lists the models the server reports as
installed, says which of them cannot produce structured filters, and picking one
runs the next turn on it and keeps the choice on the conversation, so reopening
restores it. A conversation left on a model that is no longer installed still
names it, so a player sees what it is set to and that it is missing rather than
a control that shows nothing.

**Blocked by:** 37 - The installed models can be listed; 41 - The conversation's
language is the player's to choose.

**Status:** ready-for-agent

- [ ] The chooser lists the models the server reports, with structured-output
      support visible.
- [ ] Picking a model runs the next turn on it and is kept on the conversation,
      so reopening it restores the choice.
- [ ] A conversation set to a model that is not installed names it and says what
      to do about it.
- [ ] The control is reachable and usable without a mouse.
- [ ] Tests fake the network and assert the list, the choice, what a following
      turn carries, and the missing model.
- [ ] Build and lint pass, and the design record covers the chooser.

**Notes:** It follows the listing because there is nothing to pick before it,
and it follows the language control because both hand their value to the same
turn request. The server already refuses a model it does not have rather than
quietly answering with another one, so a conversation left on a model that was
removed is a state a player should be able to see and leave.

# 35 - The chat works without a mouse

**What to build:** The whole flow, verified and fixed for a player who uses a
keyboard or a screen reader: starting a conversation, moving between
conversations, asking a question, watching it answer, reading the cards it
suggested, and renaming or deleting a conversation.

**Blocked by:** 33 - The client streams a turn; 34 - Rename and delete a
conversation from the sidebar.

**Status:** Resolved (2026-09-16)

- [x] Every control in the app can be reached, activated, and understood from
      the keyboard alone, in an order that follows what is on the screen.
- [x] Focus is always visible, and it lands somewhere sensible after each
      action, including when a turn finishes.
- [x] The turn's progress, its answer as it is written, and its failures are
      announced to assistive technology, without repeating the rest of the
      conversation.
- [x] Cards, images, controls, and the conversation list carry the labels and
      roles that make them readable as what they are.
- [x] The pass is recorded: what was walked through, what was wrong, and what
      was fixed.
- [x] Tests cover the keyboard path through the flow, not only the pointer one.
- [x] Build and lint pass.

**Notes:** This is the last slice of the feature and the one that checks the
accessibility criteria the earlier tickets carry, so a finding here is a fix
rather than a note for later. Walk the keyboard path against the running app;
where something can only be seen with a screen reader, record what was checked
and how. A dedicated audit tool would be an install the maintainer has to run, so
ask before adding one.

**Outcome:** The pass was walked against the running app, and what it found was
fixed.

**What was walked.** The focusable order was read out of the DOM on a
conversation with two conversations in the list and eight suggested cards: the
skip, the brand, New, then each row's link, Rename and Delete, then every card as
a link to its source, then the request field and Send. The row actions were seen
to come forward and take the ring when the keyboard reached them. A rename was
driven entirely by keyboard, from the row to the field to Enter, and took effect
in the store, the list and the page title. A request was typed, tabbed to Send
and submitted with the keyboard. The live regions were read back as roles and
attributes, and the accessibility tree was read for every control's name.

**What was wrong.** Five things, all fixed here.

Focus was thrown away after a request: the field was disabled while the turn ran,
so the control that had focus went dead and focus fell to the document. The field
now stays usable while Send is out of action, the announcement still says the turn
is running, and submitting puts focus back in the field, which is where the next
request is typed.

Focus was thrown away after a rename or a delete, and Escape did nothing. Closing
a row's controls now has one path that returns focus to the row, or to the
conversation that took its place in the list, or to the control that starts a new
one; Escape and Cancel take it, and so does an empty name.

The delete confirmation was a sentence nothing was attached to, so a screen
reader user heard the same button before and after the one irreversible action.
The question is now an alert and what the confirmation is described by.

Reaching the conversation cost a stop per row control, which grows with the
player's history: sixteen stops with two conversations. A skip link is now the
first thing focus finds on a conversation address, and it lands on the request
field, or on the conversation itself when a conversation is loading, missing or
unreadable and there is no request to land on.

The focus rings on the newest controls used Lampglow, which the record keeps for a
filled control's hover; every focus ring in the app is now the record's Halo
Amber.

**What was checked and how.** The announcements are the one thing that cannot be
seen from here: there is no screen reader in this environment, so the mechanism
is what was verified, through the accessibility tree and the live regions' roles.
The turn's progress is a polite status, the answer as it is written is a log
mounted before its first piece with one node per piece, and a failure is an
alert; the tests assert exactly those. Whether a given screen reader speaks them
well is not something this environment can answer.

An automated audit was run rather than installed: Lighthouse on the running app
scores accessibility 100 and best practices 100. The three audits it failed are
meta description, robots.txt and llms.txt, which are about being found rather than
about being usable, and a loopback, single-user app does not aim at them.

**Tests.** The keyboard path is covered rather than only the pointer one: the
order through the sidebar to a card's source and on to the next card, the skip
link and where it lands, the row's actions and the confirmation taking focus, a
rename saved with Enter and one called off with Escape, a failed delete leaving
focus on the row, and focus staying in the field after a request is sent. The
client suite is 42 tests and the full suite is 329.

**Notes for later:** The tab-order tests assert exact stop counts, which is what
makes them evidence of order and also what will make them fail the next time a
stop is added before their target; a helper that walks focus and asserts each stop
in turn would say the same thing without the count. Focus is returned by looking
the row up by its id, which survives the list reordering under a rename but is an
imperative lookup that a ref map would express without; and the skip panel covers
the brand mark while it holds focus, which is what a skip link does.

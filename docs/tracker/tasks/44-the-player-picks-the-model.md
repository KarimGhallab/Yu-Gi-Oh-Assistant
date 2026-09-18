# 44 - The player picks the model

**What to build:** The chat view lists the models the server reports as
installed, says which of them cannot produce structured filters, and picking one
runs the next turn on it and keeps the choice on the conversation, so reopening
restores it. A conversation left on a model that is no longer installed still
names it, so a player sees what it is set to and that it is missing rather than
a control that shows nothing.

**Blocked by:** 37 - The installed models can be listed; 41 - The conversation's
language is the player's to choose.

**Status:** Resolved (2026-09-17)

- [x] The chooser lists the models the server reports, with structured-output
      support visible.
- [x] Picking a model runs the next turn on it and is kept on the conversation,
      so reopening it restores the choice.
- [x] A conversation set to a model that is not installed names it and says what
      to do about it.
- [x] The control is reachable and usable without a mouse.
- [x] Tests fake the network and assert the list, the choice, what a following
      turn carries, and the missing model.
- [x] Build and lint pass, and the design record covers the chooser.

**Notes:** It follows the listing because there is nothing to pick before it,
and it follows the language control because both hand their value to the same
turn request. The server already refuses a model it does not have rather than
quietly answering with another one, so a conversation left on a model that was
removed is a state a player should be able to see and leave.

**Outcome:** The model chooser sits beside the language in the header, as the
same quiet control with its own caption, and its options are the models the
server reports rather than a list this app keeps. Each option carries what the
model can do: one that cannot produce structured filters says so in its own
option, and one that cannot answer a turn at all says that instead, because that
is the fact that matters when it is chosen. The second of those closes, where a
player can see it, the gap ticket 37 recorded when the listing landed, and the
chosen model's limitation is repeated under the row: a quiet note for the model
that answers without a schema, which is a trade, and the alert line for the one
that cannot answer, which is a dead end.

Picking one patches the conversation, moving the model and nothing else, and the
turn carries it, so the next turn runs on the model the player is looking at
rather than on the one the conversation had a moment ago. That meant the turn's
settings became a thing of their own, the language and the model together, and
every request body in the tests had to say which model it was sent with, the
same way they learned to say which language.

A conversation left on a model the machine no longer has is the state the ticket
was written for. The chooser always shows a name, because the missing model gets
an option of its own rather than leaving the control blank, and the line under
the row says which model it is and what to do about it, in the alert line and in
the same words the server uses when a turn is refused for it.

The chooser also made the header crowded enough that the title was being cut to
a letter, so the row wraps: the settings drop under the name when the window
cannot hold both, and it is the name that gives way last.

Three tests fake the network for this: the listing with both kinds of limitation
in its options; a model picked, the patch that keeps it, and the turn that
follows carrying it; and a conversation on a model that is not installed, named
in the chooser with the command that would install it. The tab-order test counts
the chooser as the stop it is. The type check, 360 tests across 32 files, lint,
build, formatting, the dependency rules over 149 modules and 385 dependencies,
and the unused-code report at exactly its previous findings all pass, and the
design record gained the chooser, the two notes under it, and the wrapping row.

Verified live against the real instance, which has six models installed: the
chooser listed all six with the embedding model marked "cannot answer"; picking
`mistral:7b` patched the conversation with `{"model":"mistral:7b"}` and the next
turn went out as
`{"text":"a dark monster","language":"en","model":"mistral:7b"}`, whose parse
had mistral's own shape about it; a conversation created on `ghost:latest` showed
that name in the chooser and "ghost:latest is not installed. Run ollama pull
ghost:latest to install it." under the row; and the wrap fix was made because
the screenshot showed "New conversation" cut down to a letter.

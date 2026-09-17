# 38 - The chat shows what the request was understood as

**What to build:** After a turn, the chat view shows one chip per filter that
turn was searched with, reading as the field, the operator, and the value, so a
player can tell whether the assistant understood the request. A request that
could not be turned into constraints says so instead, as a search of the
player's own words with no chips beside it. Reopening a conversation shows the
chips of its last turn, so a player coming back to one sees what it was last
asking for.

**Blocked by:** 36 - The controls can name what they must send.

**Status:** Resolved (2026-09-17)

- [x] The filters a turn reports are shown as one chip each.
- [x] A turn that degraded to free text says the request was searched as written
      and shows no chips.
- [x] Reopening a conversation shows the filters its last reply was searched
      with.
- [x] The chips are readable and announced without a mouse, and the degraded
      state is announced.
- [x] Tests fake the network and assert what is shown for a parsed turn, a
      degraded turn, and a reopened conversation.
- [x] Build and lint pass, and the design record covers the chips.

**Notes:** Both sources already exist: a turn streams the filters it is about to
search with, and a stored reply carries its own filters. The client reads and
validates that event today and renders nothing, so this is its first consumer.
Taking the filters from the turn's own report rather than from the stored reply
is what makes the chips right while a turn is still running.

**Outcome:** The event the client was reading and dropping now has a reader, and
the conversation says what the last search was understood as, on a line above the
request field. One fact per filter, in mono: the field it constrains is quiet and
what it asks of that field sits beside it. The facts are set apart by space and
nothing else, so no filter became a pill, a tag, or a box, and the design record
gained a line saying so.

What the readout shows comes from the turn's own report, and that report is kept
past the end of the turn rather than dropped with it. The reason is the one gap
in the two sources: a stored reply keeps the filters a search ran with and not
the reason a search ran without any, so a turn that came down to free text says
so only while it is running. Keeping the report is what lets the readout say
"Searched as written" and repeat the words the search fell back on, instead of
settling into the vaguer thing a reply can support once the turn is over.

Opening a conversation is the other path: with no report in hand, the readout
reads the filters of the last reply that has any. A conversation whose last
search carried no filters says only that, which is true whether the parse found
nothing or the player asked for no constraints, and is all a stored reply can
distinguish. Storing the status on the reply would close that too and is
recorded here rather than done, because it changes the wire shape and the store
for a sentence.

Readable without a mouse is the whole of it: the facts are a labelled list of
text, and nothing about them is behind a pointer. Announced is the status line
beside Send, which is the composer's live region and already says how the search
was arrived at; the readout is deliberately not a second live region, because two
of them would say the same thing in the same breath. That is written into the
design record with the readout itself.

Verified live against the real index, on a scratch store whose index was
symlinked so the maintainer's own conversations were untouched, running the
installed `llama3.1:8B`: the facts appeared while the turn was still running,
before its answer had finished; a reload restored the same facts from the stored
reply; and a later request showed why this exists at all, because asking for
"Blue-Eyes" was understood as `race is Normal Monster` and the readout is what
put that in front of the player. The type check, 347 tests across 32 files, lint,
build, formatting, the dependency rules over 147 modules and 379 dependencies,
and the unused-code report at exactly its previous findings all pass. Nothing a
player could see before this ticket changed except for the line that is now
there.

# 40 - A filter can be added

**What to build:** A player constrains a search with a filter the request never
named, choosing from the fields the search supports. Each field offers only what
it accepts: a number for a level or a stat, text for a race or an archetype, and
a fixed set for a card type, a frame type, an attribute, or a link marker. The
added filter joins the set the next turn runs with.

**Blocked by:** 39 - A chip can be corrected and the turn re-run on it.

**Status:** Resolved (2026-09-17)

- [x] A filter can be added by choosing a field, an operator, and a value.
- [x] Only the operators a field accepts are offered, and the value is gathered
      in the kind that field needs.
- [x] A field with a fixed set of values offers those values rather than asking
      the player to spell one.
- [x] The added filter is part of the set the next turn is searched with.
- [x] Adding is reachable and usable without a mouse.
- [x] Tests fake the network and assert an added filter reaching the search.
- [x] Build and lint pass, and the design record covers adding a filter.

**Notes:** This is where the vocabulary ticket pays off: nothing offered may be
something the server would refuse, and the pairing of a field with its operators
is the schema's own. It is the same surface as correcting a chip, which is why
it follows that one.

**Outcome:** The readout offers the filter the request never named, beside the
facts and beside the note a search with no filters leaves: a quiet control in the
same treatment and the same row, so the readout stays one line about one search.
Pressing it opens the editor a correction uses, with the field first and
choosable.

Choosing a field is what gathers the rest. The operators are the ones that field
takes, and the value is asked for the way the field takes it: a fixed set where
the domain has one, which arrives with the first of them already chosen, so the
filter is one the search accepts before the player has touched anything but the
field; and a number or words where the player has to fill them in, which is what
keeps Add out of action until they do. The vocabulary is the domain's own, and
the filter is put through the filter schema before Add will take it, so nothing
that could be built here can be refused by the server.

Adding appends to the set, and the whole set is what the next turn is searched
with instead of the request being read again, exactly as a correction is. The
keyboard comes back to the added fact. The readout is the region this lives in,
which appears once a search does, so a conversation with nothing in it has no way
to add a filter yet; that is a scope call rather than a hole, since a turn always
carries words, and it is recorded here rather than left unsaid.

Two tests fake the network for it: an added filter reaching the search beside the
one already there, with the field, the operator, and the value it started on; and
the value and the operators following the field from one that takes a number to
one that takes words to one that takes a fixed set, with Add out of action while
the value is the player's to fill in. They bring the client to 352 tests. The
type check, lint, build, formatting, the dependency rules over 148 modules and
382 dependencies, and the unused-code report at exactly its previous findings all
pass, and the design record now describes the readout as offering the filter the
request never named and the editor as correcting one or adding one.

Verified live against the real index on a scratch store with the index symlinked,
running the installed `llama3.1:8B`. A turn's readout showed its two facts with
Add beside them; opening it put the keyboard in a field chooser of all ten fields
named in words, with the operators of the first (a number) and a value the player
had to fill in; choosing frame type turned the value into a chooser of the frame
types, already on "spell", with Add enabled; adding appended the fact and handed
the keyboard to it; and the next request went out as
`{"text":"spell cards that clear the field","filters":[{"field":"attribute","operator":"eq","value":"LIGHT"},{"field":"atk","operator":"gte","value":2500},{"field":"frameType","operator":"eq","value":"spell"}]}`.
The server searched on exactly that and found nothing, which is what a corrected
set is allowed to do: a Spell card with 2500 attack is a contradiction, and the
search honoured it instead of quietly dropping a filter the model had written.

Recorded while verifying this, and outside this ticket: the frame is built on
`min-h-screen`, so a conversation long enough to fill the window makes the
document itself scroll, and the composer sits below the fold until the field is
focused or the player scrolls. The design record says the main region is the only
thing that scrolls vertically, so the shell's height is worth a ticket of its
own rather than a quiet edit inside a feature ticket.

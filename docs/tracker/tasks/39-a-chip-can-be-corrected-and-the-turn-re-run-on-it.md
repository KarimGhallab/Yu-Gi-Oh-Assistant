# 39 - A chip can be corrected and the turn re-run on it

**What to build:** A player corrects a chip or takes one away and sends the
request again, and the search runs with the set they corrected instead of
reading the request a second time. Taking every chip away is a deliberate
question with no constraints at all, not a request to be re-parsed. A request
sent without touching the chips is still parsed as usual, because the player has
said nothing about the filters.

**Blocked by:** 38 - The chat shows what the request was understood as.

**Status:** Resolved (2026-09-17)

- [x] A chip's operator or value can be changed, and the next turn is searched
      with the corrected set.
- [x] A chip can be removed, which broadens the search the same way.
- [x] Sending with every chip removed runs an unconstrained search rather than
      re-reading the request.
- [x] A turn sent without touching the chips is still parsed from the request.
- [x] What the turn reports back is the set that ran, so the chips show the
      correction that was used.
- [x] Tests fake the network and assert the corrected, the emptied, and the
      untouched cases.
- [x] Build and lint pass, and the design record covers editing a chip.

**Notes:** Ticket 28 built the override path this rides on, and recorded the
rule that keeps it safe: send the filters only when the player edited them, and
send an empty list when they cleared them. Sending the filters on every turn
would skip parsing forever, and a cleared set says something different from an
untouched one, which is why the empty list is sent rather than left out.

**Outcome:** A fact in the readout is now the control that corrects it. Pressing
one turns it into the controls that say it: the field it constrains, then the
operator and the value, gathered the way that field takes them, a fixed set where
the domain has one and a number where the field is a stat. Save, Remove, and
Cancel sit beside them in plain text, Escape calls the whole thing off, and the
keyboard comes back to the fact that took the corrected one's place, or to the
request field when the last one was the one taken away.

Nothing here can build a filter the search would refuse. The operators and the
values come from the domain's own description of the filter schema, which is what
ticket 36 put behind the contracts, and the corrected filter is put through the
filter schema before it can be saved, so Save is out of action rather than
sending something the server would turn down.

The correction lives next to the turn's report and is the whole difference
between the two kinds of search: no correction at all means the filters are left
out and the request is parsed as usual, and a correction means the set is sent
and nothing is parsed, an empty set included. A correction is done with once the
turn reports the set it ran with, compared by what the filters say rather than by
identity, because a report is freshly built filters. A correction the player
makes while a turn is still running is not thrown away by that turn's report: it
is not the set that was sent, so it stays for the next one.

Tests fake the network for the three cases the ticket names: a corrected chip
reaching the search and the report then taking the chips over, the next request
after that going back to being parsed; every chip removed being sent as an empty
list; and a request sent with chips on screen carrying no filters at all. The
type check, 350 tests across 32 files, lint, build, formatting, the dependency
rules over 148 modules and 382 dependencies, and the unused-code report at
exactly its previous findings all pass, and the design record gained the fact as
a control, the correcting state, and the two tokens and component that describe
them. Its Do-not line about filters was wrong after this and was corrected: a
filter is not a pill or a box, but it is now something the player presses.

Verified live against the real index on a scratch store with the index symlinked,
running the installed `llama3.1:8B`. The readout appeared while the answer was
still streaming; opening its ATK fact gave the operator chooser and a number
field, with the keyboard already in the group; correcting it to 3000 and saving
put the keyboard back on the corrected fact; the next request went out as
`{"text":"the same again","filters":[{"field":"attribute","operator":"eq","value":"LIGHT"},{"field":"atk","operator":"gte","value":3000}]}`
and the server searched on exactly that; removing both facts left "No filters" on
screen with the keyboard on the request field; and the next request went out as
`{"text":"anything at all","filters":[]}`, searched with no constraints at all.
The models are still the weak link the readout exists for: that same live run
answered a two-filter search with a template of invented "requests", while the
cards beside it were the right ones.

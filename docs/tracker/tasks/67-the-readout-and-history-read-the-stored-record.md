# 67 - The readout and history read the stored record

**What to build:** A reopened conversation shows how its search was understood.
The client reads the turn's search record instead of rebuilding it, so a turn
that searched the player's own words still says so after a reload, and the
rewrite keeps showing beside the request. The old message-level `filters` and
`query` leave the contract.

**Blocked by:** 66 - The reply carries one search record.

**Status:** Resolved (2026-09-18)

- [x] The client builds the search interpretation from the turn's frames and
      from the stored record, one shape, with no second named type of its own.
- [x] Opening a conversation shows the last search's record, so a free-text
      turn reads "Searched as written" rather than "No filters".
- [x] "Searched as" still shows the rewrite under the request, paired from the
      reply's record.
- [x] The contract drops the old message-level `filters` and `query`, and the
      server stops deriving them.
- [x] Client and route tests cover the reopened free-text readout and the
      rewrite line.
- [x] The repository gates stay green.

**Notes:** ADR-0006 and `GLOSSARY.md` already record the decision. This is the
user-visible half.

**Outcome:** The client reads the reply search record on reopen and builds
the same shape from the frames while a turn runs, and the rewrite is paired
from the reply for the line under the request. The contract drops the old
message-level filters and query and the server stops deriving them. Client and
route tests cover the reopened free-text readout and the rewrite line. All gates
green.

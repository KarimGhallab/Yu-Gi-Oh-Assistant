# 66 - The reply carries one search record

**What to build:** A turn's search becomes one record the API answers with. The
message contract gains a nested `search` of the filters, the free text, and the
status; the store keeps it in one column and writes it with the reply, in the
same append as the answer and the card ids. The old message fields are still
served, derived from the record, so nothing on screen changes yet.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] The message contract has an optional nested `search` of the filters, an
      optional query, and an optional status, while the old `filters` and
      `query` are still served.
- [x] `packages/db` keeps the record in one `search_json` column, validates the
      filters on read, and carries the status code.
- [x] The reply is appended with the search the turn ran, in one write with the
      answer and the card ids, and the separate query write is gone.
- [x] The messages migration rebuilds the table with the record column and
      without the old ones, empty, saying stored turns are not carried.
- [x] The API derives the old `filters` and `query` from the record, so the
      client and the readout are unchanged.
- [x] Store and server tests cover the record round trip, the reply carrying it,
      and a turn that fails storing no search.
- [x] The repository gates stay green.

**Notes:** The decision is recorded by amending ADR-0006. The old fields are
derived from the record here and removed in ticket 67.

**Outcome:** The message contract carries one nested search of the filters, the
free text, and the status, with the old message-level filters and query derived
from it. `packages/db` keeps the record in one `search_json` column, validates
the filters, writes it with the reply, and loses `setQuery`; migration 5
rebuilds `messages` empty. `runTurn` stores the search with the reply and
`projectMessages` derives the old fields. ADR-0006, `GLOSSARY.md`, and
`ARCHITECTURE.md` record it. All gates green.

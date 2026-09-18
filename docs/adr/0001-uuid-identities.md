# UUID identities for conversations and messages

Conversations and messages are identified by a version 4 UUID rather than an
autoincrementing integer. Nothing this app needs pushes it that way: it is
local, single user, and hands out no ids over a network, which is the usual
reason to stop counting rows. The reason is smaller and firmer: an id should name
a row and nothing else, and an integer says how many rows came before it, which
no client has a use for and every reader of an address can see.

The schema was rebuilt rather than migrated. A row that was written under an
integer id is gone, because a number is no longer an id anything can name; there
was no reasonable way to carry those rows over and nothing worth carrying. The
migration that does it drops both tables and creates them again, so it is also
the record of that decision.

An id used to carry order: messages read back in the order they were written,
and conversations listed newest first, because the id counted upward. A UUID does not, so both reads order by the rowid,
which SQLite hands out in the order rows were inserted, with the last change
breaking ties between conversations. That is a deliberate reliance on an
implementation detail, kept because it is exactly the old guarantee: the order
rows were written.

## Considered options

Time-ordered UUIDs (version 7) would have kept `ORDER BY id` working and made ids
sortable. They were rejected because they only approximate order: two rows
written in the same millisecond fall back on random bits, which is the one case
insertion order decides, and hand-rolling a monotonic generator to close that gap
is more moving parts than reading the rowid.

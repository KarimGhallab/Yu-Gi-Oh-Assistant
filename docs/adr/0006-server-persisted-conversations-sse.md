# Server-persisted conversations with a server-sent event turn

Conversations and their messages are persisted on the server in SQLite, and a
turn is streamed back to the client as a sequence of named server-sent events.
The client keeps no durable state: it renders what the server has, and the store
is the one copy.

Keeping the history beside the pipeline is what makes a reopened conversation
whole. The server already runs retrieval and the answer, and the store it writes
to holds each conversation's settings and, on each reply, the turn's search
interpretation and the ids of the cards it suggested. The interpretation is one
record: the filters that were understood, the free text the search ran on, and
the status the turn reported, so reopening a conversation shows how its search
was understood instead of rebuilding that from the filters alone. A filter or
the status is meaningless without the rest, which is why they travel and are
stored together rather than as separate message fields. Opening a conversation
resolves those ids against the catalog, so the cards a turn offered come back
with it even though only ids were stored. The player's message is stored before
the turn runs, which is what lets the client reconcile the message it drew
optimistically with the id the turn reports; the search interpretation is
written with the reply, which is stored only once it is complete, so a turn that
fails partway leaves the question and no answer, and no search either.

A server-sent event stream is the shape the turn already had: one request goes
out and a one-way, ordered sequence of frames comes back while the answer is
produced. It needs no duplex channel and no connection state of its own, and it
rides plain HTTP, which is what the client's fetch streaming already reads. Each
frame is named (`turn.start`, `status`, `filters`, `cards`, `answer.delta`,
`answer.end`, `turn.end`, `error`) so the client tells them apart by name rather
than order, and each is validated against the shared contract before it is
written, so a drift between the two sides is caught at the wire. The suggested
cards are emitted before the answer, which is what lets the grid render while the
prose is still arriving.

A turn is one request and is not resumable, so a dropped connection loses the
stream rather than pausing it, even though the reply is stored when it completes. The stream carries a status code
the client turns into a sentence, because the domain owns the code and the client
owns the wording. And the history is private because the server is on loopback
and unauthenticated, not because anything protects it.

## Considered options

Persisting in the browser (localStorage or IndexedDB) was rejected because the
server already owns the store and the pipeline, and a second copy would be the
one that goes stale. A WebSocket was rejected because the turn is one-directional
per request and needs neither a duplex channel nor a reconnection protocol. One
JSON response instead of a stream was rejected because the answer is the slow
part and watching it arrive is the product, and because the cards could not
render before it. Polling a job was rejected as more moving parts for the same
result.

Storing the search interpretation on the player's message and the filters on the
reply, as separate fields, was rejected because no message can then be read
without the other and the status has no home at all. A stored turn record
linking the two messages was rejected as a third table and a wider change than
the reading needs: the reply already exists only when the turn completed, so it
is where the turn's own facts belong. Folding the stream's `status` and `filters`
frames into one `search` frame was rejected because the frames are named and
work, and the durable record is what this decision is about.

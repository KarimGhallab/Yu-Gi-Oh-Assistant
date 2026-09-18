# Two stores: LanceDB for the catalog, SQLite for application state

The card catalog is a LanceDB table and the application state is a SQLite
database, both under `DATA_DIR`. The two stores hold data with different shapes,
different access patterns, and different lifetimes; no single store serves both
without bending one of them.

The catalog is a read-mostly vector index. Retrieval embeds a query and asks for
the nearest documents, and ingestion writes every card of two languages in one
pass, so the catalog is rebuilt wholesale from the dump rather than edited row by
row, and it is read-only while the server runs. That is a columnar,
similarity-shaped workload, and it is the reason a vector store is in the stack
at all.

The application state is the opposite. Conversations and messages are small,
relational, and written often: every turn appends a message and may update a
conversation's title or settings, and reopening a conversation reads rows by
identity and in insertion order. That wants transactions, durable small writes,
and ordinary indexes, which is what SQLite is for.

Keeping them apart carries the benefit the product needs: rebuilding the catalog
cannot touch a conversation, and a conversation database that will not open
cannot invalidate a good index. Each store has its own lifecycle and can be
deleted or rebuilt on its own terms. The cost is that there is no transaction
across the two. A turn stores the ids of the cards it suggested rather than
copies, so a suggestion is read back from the catalog, and the catalog stays the
authority on what a card is. The index metadata (dataset version, embedding
model, dimensions) is what ties a store of cards to the configuration that reads
it, and the boot guard is where that tie is checked.

## Considered options

Putting everything in SQLite with a vector extension would have meant one file
and one backup, at the price of a non-default extension to package and a
similarity search bolted onto a relational engine. Putting everything in LanceDB
would have meant frequent small, transactional, ordered writes against a store
built for columnar scans and similarity search. Neither buys enough to justify
bending the shape of the data, and the split is the one the rest of the
architecture already assumes.

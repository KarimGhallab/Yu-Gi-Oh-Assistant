# Composed-document, single-language embeddings

Every card is embedded as a composed document rather than as its structured
fields: the document is the card's name, an archetype line when it has one, and
its effect (`composeCardDocument`). The fields retrieval can filter on (type,
race, attribute, level, ATK, DEF, link value, link markers) are left out on
purpose. The vector is meant to carry what a card is called and what it does, and
an attribute or race folded into it would pull every card of that kind together in
a similarity search, which is exactly what the structured filters already do
exactly. The index carries one row per language partition, and a turn scopes its
search to a single language.

The catalog is bilingual: an English card's effect is English and a French
card's is French, and the configured embedding model (`qwen3-embedding:0.6b` by
default, 1024 dimensions) can embed both. Scoping a search to one partition is
what makes that model useful rather than confusing. A single mixed partition
would make a French query compete against English documents, and a
cross-language nearest neighbour is not what the player asked for; it would also
leave the answer's language ambiguous. Inside a partition, the nearest documents
are the cards the request is actually like, and the answer is written in the
language the conversation is in. A card that exists in both languages has a row
in each, so the same card id can surface from either partition, and the search
deduplicates by id.

The index stores as many rows as there are card entries across languages, not as
many as there are cards. Switching a
conversation's language changes what is searched rather than translating an
answer, which the product states as a constraint. The embedding model and its
dimensions are recorded in the index metadata, so changing either is a rebuild,
and the boot guard is what refuses to start against a stale one. And because the
filterable fields are deliberately absent from the document, a request like
"level 4 monsters" is answered by the structured filter path, never by hoping the
words are near enough.

## Considered options

Embedding the whole raw card record, statistics included, was rejected because a
shared attribute dominates such a vector and returns a kind rather than a
resemblance. Embedding only one language and translating on the way in was
rejected because the catalog is bilingual and a card's printed text belongs to
its language. One mixed partition was rejected for the cross-language noise it
introduces. Folding the filterable fields into the document and relying on the
filters to correct it was rejected for the same reason the fields are absent: two
mechanisms for one job, one of them fuzzy.

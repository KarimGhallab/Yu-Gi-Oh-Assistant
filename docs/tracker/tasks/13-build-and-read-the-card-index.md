# 13 - Build and read the local card index

**What to build:** One LanceDB table under the data directory holding the
structured card columns, a language column, and one composed-document vector per
card per language, plus a metadata record (dataset version, embedding model,
dimensions). From a developer's perspective: build the index from card records by
embedding their composed documents through the Ollama client, then read the rows,
the count, and the metadata back.

**Blocked by:** 12 - Card domain and YGOPRODeck conversion.

**Status:** Resolved (2026-09-15)

- [x] The table carries every field retrieval filters on, plus `language` and the
      composed-document vector.
- [x] A build embeds each card's composed document once per language and writes
      one row per card per language.
- [x] The metadata record holds the dataset version, the embedding model, and the
      dimensions, and can be read back.
- [x] Rows, count, and metadata are asserted in a temporary data directory with
      the fake Ollama client.
- [x] Build and lint pass.

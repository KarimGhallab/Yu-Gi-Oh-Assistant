# 18 - Ranked semantic retrieval over the card index

**What to build:** The first half of the retrieval engine. Given a free-text
request, the active language, and ranking options, return a small ranked set of
candidate cards from the local index. From a player's perspective: "cards that
banish" finds cards whose effects say so even when the wording differs, and a
vague request still returns the closest matches, or nothing when none are close
enough. This needs the one capability the index is still missing: search it by a
query vector and hand back the rows with their similarity.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] The index can be searched by a query vector, returning the matching rows
      with a similarity score, limited to a requested count.
- [ ] Retrieval embeds the free-text request through the configured embedding
      model and searches the index with that vector.
- [ ] Every query is scoped to the active language.
- [ ] A similarity floor drops weak matches, and an empty result is returned
      when nothing clears it.
- [ ] Results are card records plus a score, deduplicated by card identity,
      ordered by score, and limited to the candidate count.
- [ ] The ranking options are inputs to the library, not read from configuration
      inside it.
- [ ] Tests seed a temporary index with known cards and vectors and assert which
      cards come back, in what order, and how many; no Ollama is involved.
- [ ] Build and lint pass.

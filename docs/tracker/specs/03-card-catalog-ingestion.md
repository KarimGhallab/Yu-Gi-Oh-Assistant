# 03 - Card catalog ingestion and index

- **Status:** `ready-for-agent`
- **Kind:** spec
- **Blocked by:** 01, 02
- **Source:** architecture grilling, 2026-09-15

## Problem Statement

The assistant can only suggest cards it has locally indexed, and there is no
card data. The previous prototype fetched the YGOPRODeck dump but embedded only
card names, split metadata across two databases, and had no guard against the
embedding model changing after indexing, which silently corrupts retrieval.

## Solution

A `packages/db` ingestion path and one command that fetches the YGOPRODeck card
set in English and French, converts it to the card domain, composes one
semantic document per card per language, embeds it through Ollama, and writes a
single LanceDB index. A metadata record captures the dataset version, embedding
model, and dimensions; the server refuses to boot on a mismatch.

## User Stories

1. As a developer, I want a single command to install the card data, so that
   setup is repeatable.
2. As a player, I want both English and French card text available, so that I
   can read cards in my language.
3. As a player, I want retrieval to match card effects semantically, so that a
   card whose text never uses my exact words is still found.
4. As a player, I want the app to work offline after setup, so that only the card
   download and the model pull need the network.
5. As a developer, I want the raw dump and the index excluded from version
   control, so that the repo stays small.
6. As a developer, I want the app to tell me when the embedding model or its
   dimensions changed since indexing, so that I do not get silently bad results.
7. As a developer, I want a clear "re-run populate" instruction on that
   mismatch, so that recovery is obvious.
8. As a developer, I want the converter covered by tests, so that an API shape
   change is caught.
9. As a player, I want only cards relevant to suggestion to be stored, so that
   the index stays lean.

## Implementation Decisions

- Source is the YGOPRODeck API v7, fetched as a full dump in both English and
  French. The raw dump and the index directory live under the configured data
  directory and are gitignored.
- A card record keeps identity, stats, type, effect, image, and source URL.
  Prices and set lists are dropped for v1.
- One LanceDB table holds the structured card columns plus a `language` column.
  One composed-document vector is stored per card per language.
- The composed document is: name, type line, attribute/race, level, ATK/DEF,
  effect text. Cards are atomic; there is no chunking.
- Vectors are computed at ingestion using the configured embedding model and
  dimensions, with the model's documented document-side prefix where required.
- A metadata record stores the dataset version, the embedding model, and the
  dimensions. On boot the server compares them with the configured values and
  fails fast with an explicit re-run-populate message on mismatch.
- Images are hotlinked from YGOPRODeck; they are not downloaded or hosted. The
  card record stores the image URLs.
- The populate command is exposed from the server app
  (`pnpm -F @ygo-assistant/server db:populate`), so there is one app to run.
- v1 is a full rebuild only. No incremental refresh.

## Testing Decisions

- Good tests assert external behavior: the converted card shape, the rows and
  metadata written to the index, and the boot guard's pass/fail outcome.
- The converter is tested directly against small English and French fixtures
  derived from the real payload shape, including optional fields.
- Ingestion is tested by running the populate path against a fixture into a
  temporary data directory with the fake embedding client, then asserting the
  index rows and count and the metadata record.
- The mismatch guard is tested at the composition root (feature 01): a temporary
  index whose metadata disagrees with configuration must fail startup with the
  re-run-populate message.
- No test downloads from YGOPRODeck.

## Out of Scope

- Incremental or partial refresh.
- Retrieval queries (feature 04) beyond the fact that the index supports them.
- Card images beyond storing their URLs.

## Further Notes

- The metadata record is the single source of truth for whether the index is
  usable; the boot guard, not the populate command, enforces it.
- If a card exists in only one language, it is indexed only for that language;
  the cross-language marker is a presentation concern (feature 09).

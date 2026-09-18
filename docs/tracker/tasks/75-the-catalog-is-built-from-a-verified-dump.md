# 75 - The catalog is built from a verified dump, and its URLs are safe to render

**What to build:** The populate path refuses a dump it cannot verify and an
oversized one, the boot guard re-checks the dataset version it stored, and the
catalog stores only safe card URLs.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] `fetchCardDump` caps the body size and verifies the dump's identity, a
      pinned SHA-256 or a signed manifest, and fails closed on a mismatch.
- [x] `ensureIndexMatchesConfig` compares the stored `datasetVersion` and raises
      `StaleIndexError` when it does not match.
- [x] `dumpSchemas` constrains `image_url` and `ygoprodeck_url` to `https` with an
      allowed host, and bounds card field lengths.
- [x] A fetch test proves an oversized body and a digest mismatch both raise.
- [x] A boot-guard test proves a mismatched dataset version raises.
- [x] A schema test proves a non-`https` URL and an over-long field are rejected.
- [x] The populate, boot-guard, and schema suites stay green.

**Notes:** Finding 3 of the 2026-09-18 security review. Choose the integrity
mechanism, a pinned digest or a signed manifest, in this ticket; the pinned digest
is the floor. The client renders whatever the catalog stores, so the schema is the
checkpoint for the URL schemes.

**Outcome:** `fetchCardDump` reads the body under a 256 MiB cap, raising
`DumpTooLargeError` on overflow (it refuses a declared over-cap length before
reading and counts bytes while streaming), and computes the body's SHA-256. When
the operator pinned a digest through the new `CARD_DUMP_SHA256`, a mismatch
raises `DumpIntegrityError` before anything is written or parsed; the pin flows
through `populateCardIndex` and the populate command. `ensureIndexMatchesConfig`
now also compares the stored `datasetVersion` against the new
`CARD_DATASET_VERSION` and raises `StaleIndexError` on a mismatch.
`dumpSchemas` constrains `image_url` and `ygoprodeck_url` to `https` on
`ygoprodeck.com` or `images.ygoprodeck.com`, and bounds `name`, `desc`, `race`,
`typeline`, and `archetype`. New tests cover the fetch cap and digest, the schema
URL and length rules, and the boot guard's version pin; the populate, boot-guard,
and schema suites stay green.

The digest and version pins are opt-in. The live YGOPRODeck dump changes on every
fetch, so a fixed digest cannot be the default without breaking the populate
command for a dataset whose hash no one can know in advance; once the operator
has a dump they trust, pinning it makes any other dump fail closed. Both pins are
documented in `apps/server/.env.example` and the README.

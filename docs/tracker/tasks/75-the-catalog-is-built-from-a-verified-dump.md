# 75 - The catalog is built from a verified dump, and its URLs are safe to render

**What to build:** The populate path refuses a dump it cannot verify and an
oversized one, the boot guard re-checks the dataset version it stored, and the
catalog stores only safe card URLs.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] `fetchCardDump` caps the body size and verifies the dump's identity, a
      pinned SHA-256 or a signed manifest, and fails closed on a mismatch.
- [ ] `ensureIndexMatchesConfig` compares the stored `datasetVersion` and raises
      `StaleIndexError` when it does not match.
- [ ] `dumpSchemas` constrains `image_url` and `ygoprodeck_url` to `https` with an
      allowed host, and bounds card field lengths.
- [ ] A fetch test proves an oversized body and a digest mismatch both raise.
- [ ] A boot-guard test proves a mismatched dataset version raises.
- [ ] A schema test proves a non-`https` URL and an over-long field are rejected.
- [ ] The populate, boot-guard, and schema suites stay green.

**Notes:** Finding 3 of the 2026-09-18 security review. Choose the integrity
mechanism, a pinned digest or a signed manifest, in this ticket; the pinned digest
is the floor. The client renders whatever the catalog stores, so the schema is the
checkpoint for the URL schemes.

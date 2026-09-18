# 54 - The architecture and the product doc are written down

**What to build:** `docs/ARCHITECTURE.md` exists and describes how the pieces
fit and which boundaries are normative, and `docs/PRODUCT.md` stops claiming as
future work what the app already does.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] The architecture doc maps the components (client, server, the pipeline
      packages, the two stores, Ollama) and the data flow of a turn from request
      to streamed answer.
- [x] It states the layer boundaries the dependency rules enforce and names them
      normative, as `docs/DOMAIN.md` promises its reader.
- [x] It uses the domain vocabulary from `docs/GLOSSARY.md` and
      `docs/PRODUCT.md`.
- [x] The product doc no longer lists the filter chips, language selection, or
      model picker as planned; it describes them as delivered.
- [x] The repository gates stay green.

**Notes:** `docs/DOMAIN.md` already tells the reader that `ARCHITECTURE.md`
exists and is normative, and its consumer rules say not to flag the absence, so
the doc is overdue rather than optional.

**Outcome:** `docs/ARCHITECTURE.md` is written. It opens by naming the layer
boundaries normative, then maps the two applications and the eight packages with
a table of what each may depend on, the two stores (the LanceDB catalog and the
SQLite application state), and Ollama as an external service the boot guard
checks the index against. It then walks a turn in eight steps: the request and
its event stream, resolving settings and storing the message, parsing or taking
edited filters as they stand, searching one language partition, choosing from
the pool and trimming to what is shown with its fallback, streaming the grounded
answer, storing the reply, and the named frames. A boundaries section restates
the dependency-cruiser rules as normative prose (apps are leaves, packages
layer, entry points only, production dependencies are declared, no cycles,
`test-support` is test-only), and the closing sections cover where the data and
logs live, the three deployment shapes, and where decisions are recorded. The
vocabulary is the glossary's, linked rather than restated. `docs/PRODUCT.md` no
longer lists the readout, language switch, and model picker as planned; the
bullet now describes them as delivered, and the stale line saying the visual
direction is unrecorded now points at `docs/DESIGN.md`.

Verified by reading the doc against its sources: the package table and the
boundaries against `.dependency-cruiser.cjs`, the turn flow against
`runTurn`, `resolveSearch`, and `selectCards`, and the component map against the
route table and the package entry points. No code changed, so typecheck, the 445
tests, and lint are unaffected; `prettier --check .` passes across the
repository.

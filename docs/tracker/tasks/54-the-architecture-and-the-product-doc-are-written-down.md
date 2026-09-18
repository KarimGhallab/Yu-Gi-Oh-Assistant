# 54 - The architecture and the product doc are written down

**What to build:** `docs/ARCHITECTURE.md` exists and describes how the pieces
fit and which boundaries are normative, and `docs/PRODUCT.md` stops claiming as
future work what the app already does.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] The architecture doc maps the components (client, server, the pipeline
      packages, the two stores, Ollama) and the data flow of a turn from request
      to streamed answer.
- [ ] It states the layer boundaries the dependency rules enforce and names them
      normative, as `docs/DOMAIN.md` promises its reader.
- [ ] It uses the domain vocabulary from `docs/GLOSSARY.md` and
      `docs/PRODUCT.md`.
- [ ] The product doc no longer lists the filter chips, language selection, or
      model picker as planned; it describes them as delivered.
- [ ] The repository gates stay green.

**Notes:** `docs/DOMAIN.md` already tells the reader that `ARCHITECTURE.md`
exists and is normative, and its consumer rules say not to flag the absence, so
the doc is overdue rather than optional.

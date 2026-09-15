# Domain docs

Single-context layout. The product docs are the domain model; there is no
separate glossary file.

| What                           | Where                  |
| ------------------------------ | ---------------------- |
| Product intent and vocabulary  | `docs/PRODUCT.md`      |
| Architecture and data flow     | `docs/ARCHITECTURE.md` |
| Architecture decisions         | `docs/adr/`            |

## Consumer rules

- Read `docs/PRODUCT.md` before changing anything user-facing: its vocabulary
  and constraints are normative.
- Read `docs/ARCHITECTURE.md` before changing the server, the pipeline, or the
  data layer. Its layer boundaries are normative.
- Record non-obvious technical decisions as ADRs in `docs/adr/`.
- When a skill refers to `CONTEXT.md`, use `docs/PRODUCT.md` (and
  `docs/ARCHITECTURE.md` for anything structural).

If a referenced file does not exist yet, proceed silently. Do not flag its
absence or suggest creating it upfront.

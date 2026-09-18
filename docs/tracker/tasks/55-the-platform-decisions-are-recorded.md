# 55 - The platform decisions are recorded

**What to build:** The decisions that shape the repository's platform are
recorded as ADRs: why the monorepo is shaped as it is, why state is split across
two stores, and what the cross-cutting conventions are. The existing
`0001-uuid-identities` ADR keeps its number, and the new ones follow it.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] ADR 0002 records the monorepo stack (pnpm workspaces, TypeScript project
      references, ESM, the pinned toolchain) and its consequences.
- [x] ADR 0003 records the two-store split (LanceDB for the card index, SQLite
      for app state) and why one store does not serve both.
- [x] ADR 0010 records the logger package and the cross-cutting conventions.
- [x] Each follows the existing ADR's shape: the decision in prose, its
      consequences, and the options considered where there were any.
- [x] The numbering keeps `0001-uuid-identities` in place.
- [x] The repository gates stay green.

**Notes:** The spec listed these as 0001, 0002, and 0009, but `0001` is already
the UUID identities decision, so the set shifts by one. Do not renumber the
existing ADR.

**Outcome:** Three ADRs are written in the shape the existing one sets: a
descriptive title, the decision in prose with its consequences, and a
`## Considered options` section. `docs/adr/0002-monorepo-stack.md` records the
workspace as one pnpm monorepo of two apps and eight packages, built with
TypeScript project references and shipped as ESM on a Volta-pinned toolchain, and
names the consequence that a workspace package resolves to its built output, so a
fresh checkout must build before the package-importing suites run.
`docs/adr/0003-two-store-split.md` records the LanceDB catalog and the SQLite
application state as two stores with different shapes, access patterns, and
lifetimes, and names the cost (no cross-store transaction, suggestions read back
by id) and the benefit (a catalog rebuild cannot touch conversations).
`docs/adr/0010-logger-and-cross-cutting-conventions.md` records the logger
package behind `ILogger`, the typed `DomainError` that lets a layer fail in
domain terms and the boundary translate, and the conventions that span the
workspace (entry-point imports, `.js` specifiers, enums for closed vocabularies,
syncpack, dependency-cruiser). `0001-uuid-identities` keeps its number; the new
ones are 0002, 0003, and 0010, leaving 0004 through 0009 to the pipeline and
conversation ADRs of the sibling tickets.

Verified by reading each ADR against its sources: the workspace and toolchain
against `pnpm-workspace.yaml`, `tsconfig.base.json`, and the root manifest; the
layering against `.dependency-cruiser.cjs`; the two stores against the catalog
and store entry points and the boot guard; and the logger and error types against
`PinoLogger.ts` and `DomainError.ts`. No code changed, so typecheck, the 445
tests, and lint are unaffected; `prettier --check .` passes.

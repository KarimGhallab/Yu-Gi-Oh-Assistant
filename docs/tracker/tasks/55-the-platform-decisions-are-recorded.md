# 55 - The platform decisions are recorded

**What to build:** The decisions that shape the repository's platform are
recorded as ADRs: why the monorepo is shaped as it is, why state is split across
two stores, and what the cross-cutting conventions are. The existing
`0001-uuid-identities` ADR keeps its number, and the new ones follow it.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] ADR 0002 records the monorepo stack (pnpm workspaces, TypeScript project
      references, ESM, the pinned toolchain) and its consequences.
- [ ] ADR 0003 records the two-store split (LanceDB for the card index, SQLite
      for app state) and why one store does not serve both.
- [ ] ADR 0010 records the logger package and the cross-cutting conventions.
- [ ] Each follows the existing ADR's shape: the decision in prose, its
      consequences, and the options considered where there were any.
- [ ] The numbering keeps `0001-uuid-identities` in place.
- [ ] The repository gates stay green.

**Notes:** The spec listed these as 0001, 0002, and 0009, but `0001` is already
the UUID identities decision, so the set shifts by one. Do not renumber the
existing ADR.

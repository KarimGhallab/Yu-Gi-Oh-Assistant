# 70 - One reader for a stored value, and the store reads through it

**What to build:** A new internal reader is bound to the application store, and
the store reads its columns through it. An absent value is `undefined`
everywhere, the conversation title keeps its `null` shape by adapting at the
read, and a column that does not hold what the schema promised raises one typed
error naming the store and the field. The reader is whole (strings, optionals,
numbers, lists, enum members, a validated JSON read, and a write) and has a
direct test. The catalog and the JSON read keep their old paths for now.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] A new internal module in `packages/db` exports the reader factory, the
      `StoredValueReader` interface, the `enumGuard` factory, and
      `StoredValueError`, and it is not added to the package entry point.
- [x] The factory binds a source once and the reader offers `toString`,
      `toOptionalString`, `toNumber`, `toOptionalNumber`, `toList`,
      `toStringArray`, `toNumberArray`, `toEnum`, `toOptionalEnum`, `readJson`,
      and `writeJson`.
- [x] `toEnum` and `toOptionalEnum` take a type guard built by `enumGuard`, so
      the membership rule is stated once and no `as` assertion is needed.
- [x] An absent optional reads as `undefined`; the store's title read still
      answers `string` or `null`.
- [x] A value that is not what the schema promised raises `StoredValueError`
      carrying the source, the field, and the value.
- [x] The store adapter binds the reader to "the application store", delegates
      its scalar reads and its JSON write, and keeps the imports its callers use.
- [x] A direct test covers every reader method; a repository test injects a
      wrong scalar column and proves the raise.
- [x] The repository gates stay green.

**Notes:** The architecture review's first candidate for spec 17. This is the
expand step: the reader lands whole while the catalog and the store's JSON reads
still use their old paths. `toEnum` takes an `enumGuard` rather than a set
because the no-`as` rule forbids casting a `string` to the enum type, and a type
predicate is how the rest of the codebase narrows a stored enum.

**Outcome:** A new internal reader binds a source and reads strings, optionals,
numbers, lists, enum members, a validated JSON value, and a write. The
membership rule is stated once through an enum guard, so no type assertion is
needed. The store binds it to the application store, keeps its callers' imports,
reads an absent value as `undefined`, adapts its title to `null` at the read,
writes JSON through the reader, and raises one typed error naming the store and
the column. Its direct test covers every read, and a repository test injects a
blob title and proves the raise. All gates green.

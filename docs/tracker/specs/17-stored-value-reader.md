# 17 - One reader for a stored value

- **Status:** Resolved (2026-09-18)
- **Kind:** spec
- **Blocked by:** 05, 12
- **Source:** architecture review, 2026-09-18

## Problem Statement

Reading a value back out of storage is written twice.
`packages/db/src/store/storedValues.ts` reads the application store's rows and
`packages/db/src/catalog/normalizeCard.ts` reads the card index's rows, and four
rules are identical in both: a string column must hold a string, an optional
column may be absent, an enum column must be a member, and a mismatch raises with
the field named. The two copies disagree on the absent value (`null` for the
store, `undefined` for the catalog), each repeats its own private enum guards,
and neither has a direct test, so the throw paths are reachable only through a
repository or an index build. `MessageRepository.toSearch` reads one stored value
with four mechanisms at once: the scalar reader, a blind `JSON.parse(...) as`, zod
for `filters`, and inline `typeof` for `query` and `status`. So the rule that a
stored row is corrupt when it does not hold what the schema promised is stated
twice, untested, and applied inconsistently.

## Solution

Give the loose read of a stored value one module. A factory binds a source name
and returns one flat reader: strings, optional strings, numbers, lists, enum
members, and a JSON value read through a zod schema. The store and the catalog
become adapters over it, each binding its own source and keeping the names its
callers know, so the rule, the presence convention, and the error are declared
once while the repositories and the card adapter keep their shape.

## User Stories

1. As a maintainer, I want the rule for reading a stored value declared once, so
   a change to what counts as corrupt is one edit.
2. As a maintainer, I want an absent value to mean one thing, so a reader never
   guesses between `null` and `undefined`.
3. As a maintainer, I want a corrupt row to raise with its source and field, so a
   failure names which store and which column.
4. As a maintainer, I want a JSON column read through one validated read, so a
   blind type assertion cannot reach the rest of the code.
5. As a maintainer, I want the reader testable on its own, so the throw paths do
   not need a database or an index build.
6. As a maintainer, I want the store's and the catalog's callers to keep their
   imports, so the deepening does not ripple into the repositories.
7. As a developer, I want a non-string column, a schema mismatch, an enum
   non-member, and a wrong scalar to cross the seam as one error type, so a
   caller catches once.
8. As a developer, I want a failed read to name the real column, so the catalog
   says `level` rather than `number`.
9. As a developer, I want a stored search whose `query` or `status` is not a
   string to raise like any other corrupt value, so the store stops dropping it
   silently.
10. As a developer, I want the store's optional title to stay `string | null`, so
    its public shape does not change.

## Implementation Decisions

- **The module.** A new internal module `packages/db/src/storedValue.ts`, not on
  the `db` entry point. It exports `StoredValueReader`,
  `createStoredValueReader(source)`, and `StoredValueError`. It is the one place
  the rule that a stored value must be what the schema promised is stated.
- **The factory.** `createStoredValueReader(source: string): StoredValueReader`
  binds the source once, so a call site names only value and field and the error
  can still say where the read happened.
- **The interface.** One flat reader of free methods:
  `toString(value, field)`, `toOptionalString(value, field)`,
  `toNumber(value, field)`, `toOptionalNumber(value, field)`,
  `toList(value, field)` (an array or an Arrow iterable),
  `toStringArray(value, field)`, `toNumberArray(value, field)`,
  `toEnum(value, allowed, field)`, `toOptionalEnum(value, allowed, field)`,
  `readJson(value, schema, field)`, and `writeJson(value)`.
- **Presence.** An absent value is `undefined`. `toOptionalString` and
  `toOptionalNumber` return `string | undefined` and `number | undefined`, the
  shape the catalog already used. The store adapts to `null` only where its
  persisted shape demands it.
- **The error.** `StoredValueError extends Error`, carrying `source`, `field`,
  `value`, and optional `options`, with
  `Unexpected value for "<field>" in <source>: <value>` as its message and
  `this.name = new.target.name`, matching `DomainError`'s style. It is exported
  from the module only.
- **The JSON read.** `readJson(value, schema, field)` reads presence through the
  scalar reader, parses the JSON, and validates it with the zod schema. A
  non-string column and a schema mismatch both raise `StoredValueError`; a
  mismatch carries the zod failure as its `cause`, and the raw column value is
  the error's `value`.
- **The enum read.** `toEnum(value, allowed, field)` is the one membership rule.
  Concrete names (`toLanguage`, `toMessageRole`, `toCardType`, `toFrameType`,
  `toOptionalCardAttribute`, `toLinkMarker`) stay as thin wrappers in the
  adapters that need the name.
- **The store adapter.** `store/storedValues.ts` binds
  `createStoredValueReader('the application store')` and keeps its current
  exports (`toString`, `toOptionalString`, `toLanguage`, `toMessageRole`) plus
  `writeJson`, delegating to the reader. `MessageRepository` and
  `ConversationRepository` imports are unchanged.
- **The store's presence.** `Conversation.title` stays `string | null`;
  `toConversation` and `readTitle` map `toOptionalString(...) ?? null`.
  `toSearch` and `toCardIds` branch on `undefined`.
- **The stored search.** `MessageRepository` validates a local
  `storedSearchSchema` (`filters: cardFiltersSchema`, `query:
z.string().min(1).optional()`, `status: z.string().optional()`) through
  `readJson`, so a non-string `query` or `status` raises. The `status` stays a
  plain string; narrowing it to `TurnStatus` is out of scope. `storeJson`
  becomes the reader's `writeJson`.
- **The catalog adapter.** `catalog/normalizeCard.ts` binds
  `createStoredValueReader('the card index')`, composes the reader, deletes its
  local coercers and duplicate enum guards, and gains real column labels for its
  optional reads. It exports `normalizeCard`, `normalizeCardRow`, and a named
  `toArchetype(value)` for the archetypes list.
- **The archetypes read.** `CardCatalog.archetypes` reads each cell through
  `toArchetype`, so a non-string cell raises and an absent or empty one is
  skipped. `InMemoryCardCatalog` reads its typed rows and stays as it is, because
  no stored value is being read there.
- **Untouched.** Migration ids, index metadata on zod, and the filter predicate
  literals keep their own reads. `writeJson` keeps
  `value === undefined ? null : JSON.stringify(value)`.

## Testing Decisions

- Good tests cross the seam a caller crosses. The reader is pure and bound to a
  test source, so its test calls it directly, needs no database, and asserts the
  `StoredValueError` fields and message.
- `storedValue.test.ts` covers every method: a string, an absent and a
  non-string optional, a number, an absent optional number, a list from an array
  and from an iterable, the array item readers, a member and a non-member enum,
  an optional enum, a valid JSON read, an invalid JSON value, and a schema
  mismatch with its zod `cause`, plus `writeJson` round-tripping with
  `readJson`.
- One new test in `ConversationRepository.test.ts` and one in
  `MessageRepository.test.ts` inject a non-string scalar column directly, so the
  repositories are proven to cross the seam and raise, which no test reaches
  today.
- The existing repository and catalog suites stay as they are; the round trips
  and the corrupt-filters test must keep passing unchanged.
- Prior art: `MessageRepository.test.ts` injects a corrupt `search_json` with
  raw SQL; the catalog tests drive `normalizeCard` through `search`, `scan`, and
  `readByIds`.

## Out of Scope

- Narrowing `StoredSearch.status` from `string` to `TurnStatus`; that belongs to
  the search-interpretation seam.
- The message JSON codec becoming a contract or a domain concern.
- Migration bookkeeping ids, index metadata, and the filter predicate literals.
- Any change to what is written to storage, and any change to the shapes a
  caller reads.
- Exporting the reader or its error from the `db` package entry point.

## Further Notes

- This deepens the seam the architecture review named "one reader for a stored
  value"; the report is in the OS temp directory from the 2026-09-18 run.
- No ADR and no glossary term: this is an internal seam of `packages/db`, not
  domain vocabulary, and no existing decision is contradicted.
- The presence divergence (`null` versus `undefined`) becomes an explicit
  adapter detail, so it can no longer drift by accident.

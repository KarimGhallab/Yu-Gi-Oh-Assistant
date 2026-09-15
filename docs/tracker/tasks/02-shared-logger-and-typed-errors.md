# 02 - Shared logger and typed errors

**What to build:** A shared logger and a typed error foundation that later
features use. From a developer's perspective: code logs structured messages
through one wrapper at a configured level, and throws typed errors that carry an
HTTP status, with both usable outside HTTP code.

**Blocked by:** 01 - Rebaseline the workspace and scaffold the packages.

**Status:** Resolved (2026-09-15)

- [x] Logging goes through a shared wrapper; no feature imports the logging
      library directly.
- [x] Logs are structured and filtered by the configured level.
- [x] Typed domain errors carry an HTTP status and a message.
- [x] Unit tests cover level filtering and error typing.
- [x] Build and lint pass.

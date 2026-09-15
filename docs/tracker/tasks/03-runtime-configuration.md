# 03 - Runtime configuration with fail-fast validation

**What to build:** The server reads its configuration from the environment once
at boot and refuses to start on an invalid one. From a developer's perspective:
a bad or missing variable stops startup with a message naming it, and a
committed `.env.example` lists every variable with its default.

**Blocked by:** 01 - Rebaseline the workspace and scaffold the packages; 02 -
Shared logger and typed errors.

**Status:** Resolved (2026-09-15)

- [x] Host, port, data directory, Ollama endpoints and models, embedding
      dimensions, retrieval parameters, log level, and environment are parsed
      and validated at boot.
- [x] An invalid or missing required variable stops startup with a message
      naming the variable.
- [x] Defaults apply when optional variables are absent.
- [x] A committed `.env.example` documents every variable with its default.
- [x] Unit tests cover a valid environment, an invalid one, and the defaults.
- [x] Build and lint pass.

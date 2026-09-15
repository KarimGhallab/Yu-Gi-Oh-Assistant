# 11 - Decouple the client and the server

**What to build:** The server is API-only and never serves the client build, so
the client can be deployed on its own host or behind its own web server. The
client resolves the API through a configurable base URL, and the server allows
explicitly configured browser origins. From a developer's perspective: the
server no longer needs the client's build output, `pnpm dev` still works through
the Vite proxy, and a separately hosted client can call the API once its origin
is allowed.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-15)

- [x] The server no longer reads or serves the client build; the composition root
      has no client directory and `/` is not a route.
- [x] The client builds its API URLs from `VITE_API_BASE_URL`, defaulting to
      same-origin requests.
- [x] The server sends CORS headers only for the origins listed in `CORS_ORIGIN`,
      and sends none when it is unset.
- [x] `.env.example` documents `CORS_ORIGIN`, and the web app documents
      `VITE_API_BASE_URL`.
- [x] Supersedes ticket 06 and the single-origin decision in spec 01.
- [x] Tests, typecheck, lint, dependency-cruiser, and the build pass.

# 06 - Single-origin client scaffold

**What to build:** A minimal client app wired so development proxies the API and
production serves the client and the API from one origin. From a developer's
perspective: `pnpm dev` gives a working page backed by the API, and a production
build is served by the server with no CORS configuration.

**Blocked by:** 04 - Server composition root, health route, and error boundary.

**Status:** Resolved (2026-09-15)

- [x] A minimal Vite React app exists in the web package and renders a page.
- [x] `pnpm dev` serves the client with API requests proxied to the server.
- [x] `pnpm build && pnpm start` serves the built client and the API from the
      same origin.
- [x] A smoke check confirms the served page loads at the server origin.
- [x] Build and lint pass.

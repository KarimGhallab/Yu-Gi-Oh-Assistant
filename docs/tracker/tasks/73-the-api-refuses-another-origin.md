# 73 - The API refuses requests from another origin

**What to build:** Every request to the API is checked against an allowed host and
origin before it reaches a route, and a body-carrying request must be JSON. A page
the user visits cannot post to the API or read a conversation, whether by a simple
cross-site request or by rebinding its DNS to loopback. The loopback binding
stays, and the host and origin check is the layer behind it.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] A middleware validates `Host` against an allowed set, loopback forms by
      default and extended by configuration, and answers `403` for an unknown
      host.
- [x] A request whose `Origin` or `Referer`, when present, is not same-origin or
      in the configured origins is rejected with `403`.
- [x] A body-carrying route requires `Content-Type: application/json`, so a
      simple `text/plain` cross-site request is refused.
- [x] A test proves a foreign origin is rejected and a same-origin request
      passes, and a test proves a non-JSON content type is refused.
- [x] The existing route and composition tests stay green.

**Notes:** Finding 1 of the 2026-09-18 security review. Do not add authentication;
ADR-0006 keeps the server unauthenticated on loopback. The one decision here is the
configuration shape of the allowlist: default to the loopback forms and fold in
`CORS_ORIGIN` where it is set. The middleware is defense-in-depth in front of the
routes, and the check fails closed.

**Outcome:** A new `originGuard` middleware in `apps/server/src/server` runs in
front of `/api/*`. It reads the request host from the URL the node adapter builds
from the `Host` header, allows the loopback forms plus the new `ALLOWED_HOSTS`
configuration plus the hostnames of `CORS_ORIGIN`, and answers `403` to any other
host. A present `Origin` or `Referer` must be a configured origin or name an
allowed host, and an unparseable one fails closed; a request with neither is left
alone so a non-browser client still works. `parseJsonBody` now requires
`application/json`, closing the simple cross-site request behind the origin
check. The middleware, parse, and config suites were added, and the existing
route, composition, and end-to-end shapes stay green: dev (Vite, `localhost`),
containers (nginx forwards the browser's host), and decoupled (`CORS_ORIGIN`).
All gates green, 55 files and 517 tests.

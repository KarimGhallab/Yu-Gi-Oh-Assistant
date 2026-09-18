# 73 - The API refuses requests from another origin

**What to build:** Every request to the API is checked against an allowed host and
origin before it reaches a route, and a body-carrying request must be JSON. A page
the user visits cannot post to the API or read a conversation, whether by a simple
cross-site request or by rebinding its DNS to loopback. The loopback binding
stays, and the host and origin check is the layer behind it.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] A middleware validates `Host` against an allowed set, loopback forms by
      default and extended by configuration, and answers `403` for an unknown
      host.
- [ ] A request whose `Origin` or `Referer`, when present, is not same-origin or
      in the configured origins is rejected with `403`.
- [ ] A body-carrying route requires `Content-Type: application/json`, so a
      simple `text/plain` cross-site request is refused.
- [ ] A test proves a foreign origin is rejected and a same-origin request
      passes, and a test proves a non-JSON content type is refused.
- [ ] The existing route and composition tests stay green.

**Notes:** Finding 1 of the 2026-09-18 security review. Do not add authentication;
ADR-0006 keeps the server unauthenticated on loopback. The one decision here is the
configuration shape of the allowlist: default to the loopback forms and fold in
`CORS_ORIGIN` where it is set. The middleware is defense-in-depth in front of the
routes, and the check fails closed.

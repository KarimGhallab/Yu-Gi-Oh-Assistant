# 29 - The client's toolchain is ready

**What to build:** The web app becomes developable, testable, and buildable like
every other package in the repository. From a developer's perspective: the test
command runs the client's tests in a DOM environment, the type check and the
linter cover them, the client validates the server's shapes through the shared
contracts package instead of restating them, and the styling pipeline is wired.
Proven by a first test that renders a screen, drives it the way a player would,
and asserts what is on it, with the network faked.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-16)

- [x] The test command runs client tests in a DOM environment with React Testing
      Library and user interactions available, and the existing node tests are
      unaffected.
- [x] The type check and the linter pass over the client's tests as well as its
      source, with the browser globals and the `.tsx` extension in reach.
- [x] The client depends on the contracts package, and a test proves the wiring
      by parsing a fixture through one of its schemas.
- [x] The styling pipeline is wired into the client: the app imports its
      stylesheet, and a production build emits it.
- [x] A first test renders a component, drives it with a user interaction, and
      asserts the visible result, with the network faked at the fetch boundary.
- [x] Build and lint pass.

**Notes:** Ask the maintainer to run the installs; never install on their
behalf. This needs the test tooling (React Testing Library, user-event,
jest-dom, and a DOM environment), the styling pipeline (Tailwind and its Vite
plugin), and the contracts workspace dependency. The client's package must
declare the dependency and the client's TypeScript configuration must reference
it, so a workspace type check builds what the client imports before the client.
Keep the DOM environment scoped to the client, so the package and server tests
stay on node: today the test configuration only sees `.test.ts` under node, and
the client's TypeScript configuration excludes tests outright. Browser globals
and `.tsx` also have to reach the lint configuration, which currently covers
only `.js`, `.mjs`, `.cjs`, and `.ts`.

**Outcome:** The client is now a first-class workspace. The test configuration
became two projects: a node project over the server and the packages, and a web
project for the client in a DOM environment with a setup file. The client's
tests are part of the type check through their own configuration, which
references the contracts package so a workspace type check builds it first, and
the linter reaches `.tsx` with browser globals. Tailwind and its Vite plugin are
wired to a stylesheet the app imports, and the client depends on the contracts
package with a test that reads a conversation and a streamed frame through its
schemas.

Three placements were decided rather than chosen. The DOM environment is scoped
per project, and the client project owns everything under the client, its plain
`.ts` tests included, so the node project keeps its general `apps/*` include but
excludes the client, which is what stops a client test from running twice. The
environment package itself lives in the root dependencies, because the root test
configuration is what names it and a configuration-referenced dependency is
attributed to the workspace that owns the configuration; the testing libraries
stay with the client, because its test files import them. And the setup file is
excluded from the client's application program, so production type checking does
not pull in test tooling.

The first test drives the scaffold's API status: the network is faked at the
fetch boundary, and the status the player sees is asserted. That needed the
scaffold to have something to drive, so it gained a "Check again" control and the
status became an enum rather than three loose strings. Ticket 31 replaces the
scaffold, and the harness is what will prove its replacement.

Verified with both compilers, since the root type check runs TypeScript 5.9.3
while the package builds run 6.0.3, and each flags the other's output as stale.
The node project ran 27 files and 269 tests, exactly as before, and the client
project ran 2 files and 5 tests in the DOM environment, 29 and 274 together. A
production build emitted the stylesheet, 5.97 kB carrying the utilities the app
uses rather than only the framework's reset. The linter reports browser globals
on the client's `.tsx` files and node globals on the server's, over 117 files. A
dry build orders the card package, then the contracts package, then the client's
three configurations, which is the clean-checkout order. The dependency rules
report no violations over 117 modules and 304 dependencies, the unused-code
report is back to exactly its previous findings, and the version check is clean.

**Notes for later:** A fresh install re-formats the lockfile in pnpm's own inline
style, which is what `prettier --check .` then objects to. The lockfile is the
only file it objects to, and leaving it out of the format scope is a repository
decision rather than something this ticket should settle. The compiler split
above is worth closing in the CI work: one TypeScript at the root would stop
`pnpm typecheck` and the package builds from disagreeing about staleness.

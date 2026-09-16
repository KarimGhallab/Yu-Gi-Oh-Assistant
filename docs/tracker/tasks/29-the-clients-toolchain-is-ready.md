# 29 - The client's toolchain is ready

**What to build:** The web app becomes developable, testable, and buildable like
every other package in the repository. From a developer's perspective: the test
command runs the client's tests in a DOM environment, the type check and the
linter cover them, the client validates the server's shapes through the shared
contracts package instead of restating them, and the styling pipeline is wired.
Proven by a first test that renders a screen, drives it the way a player would,
and asserts what is on it, with the network faked.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] The test command runs client tests in a DOM environment with React Testing
      Library and user interactions available, and the existing node tests are
      unaffected.
- [ ] The type check and the linter pass over the client's tests as well as its
      source, with the browser globals and the `.tsx` extension in reach.
- [ ] The client depends on the contracts package, and a test proves the wiring
      by parsing a fixture through one of its schemas.
- [ ] The styling pipeline is wired into the client: the app imports its
      stylesheet, and a production build emits it.
- [ ] A first test renders a component, drives it with a user interaction, and
      asserts the visible result, with the network faked at the fetch boundary.
- [ ] Build and lint pass.

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

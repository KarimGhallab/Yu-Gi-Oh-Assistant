# Monorepo on pnpm, project references, and ESM

The repository is one pnpm workspace holding two applications and eight
packages, built with TypeScript project references and shipped as ESM, on a
toolchain pinned with Volta to Node 26.5.0 and pnpm 11.20.0. The client and the
server share the card domain and the wire contracts, and the pipeline shares the
same domain with the stores; a single repository is what lets those shared things
have one definition and one version rather than one per deployable. The
dependency rules in `.dependency-cruiser.cjs` are part of the choice: the
layering the architecture names is enforced by a gate, not by convention.

Project references are what make the build order the dependency order. Each
package compiles to `dist` behind an `exports` map, and a package that depends on
another never reaches past its entry point. The consequence worth knowing is that
a workspace package resolves to its built output, so a fresh checkout has to
build before the suites that import a package can run; the pipeline builds the
workspace before the tests for exactly this reason. Tests compile in a separate,
no-emit project so a test file cannot leak into a build.

ESM everywhere (`"type": "module"`, `nodenext` resolution) matches the runtime
and the HTTP and tooling packages the server and client use, and keeps one module
system across the workspace. The cost is that a relative import carries the `.js`
extension of the compiled file, which is small in exchange for not mixing module
systems.

Volta pins the exact Node and pnpm so a machine, a hook, and CI run the same
toolchain, and the lockfile is committed with frozen installs. Drift becomes a
maintenance event with a diff rather than something a developer discovers at
runtime.

## Considered options

Separate repositories per deployable would have forced the shared domain and
contracts into a published package or a second copy, either of which puts a
release between a change to a filter and both sides seeing it. A single package
would have erased the layering the architecture depends on. npm and Yarn
workspaces would have worked, but the repository builds on pnpm's strict,
content-addressable store and the `workspace:` protocol. CommonJS was the
fallback and was rejected, because the target is ESM and a workspace split across
two module systems invites a class of interop bug this repository chose not to
carry.

# A logger package and the cross-cutting conventions

Cross-cutting concerns get a home, and the home is a small package at the bottom
of the dependency graph. Logging lives in `packages/logger` behind an `ILogger`
interface; the typed domain error and the small helpers live in `packages/utils`.
Both are leaves in the layering: everything may depend on them, so they may
depend on nothing else in the workspace.

The logger exists so that no layer imports a logging library. `createLogger`
wraps pino, and callers receive an `ILogger` with four levels and a structured
context, so the library underneath can change and a test can inject a fake
without a single caller knowing. The sink is an option of the logger rather than
a decision of each caller: development gets a colorized stream, production gets
a rotating file (10 MB, five kept) that is mirrored to stdout so a container
still surfaces it, and a test can inject a destination and read what was written.

The typed error exists so a layer can fail in domain terms and let the transport
boundary translate. `DomainError` carries an HTTP status, and its subclasses
(`ValidationError`, `NotFoundError`, `UnavailableError`) name the common cases. A
service raises a `NotFoundError` without knowing that a 404 exists; the server's
error boundary maps it, and anything that is not a `DomainError` becomes a 500
whose detail stays in the log rather than reaching the player. This is why
`utils` is a leaf: an error type and a handful of pure helpers are safe for every
layer to share, and the moment `utils` grows knowledge of the domain it stops
being safe to depend on from everywhere.

The conventions that span the workspace are recorded here because they are the
same kind of decision. Imports between packages name the package, never a path.
Relative imports carry the `.js` extension of the compiled file. Closed
vocabularies are enums, and one concept has one word, the glossary's. Dependency
versions are aligned across the workspace by syncpack, and the layering is
enforced by dependency-cruiser. A convention a gate can enforce is a rule; the
rest is a note like this one.

## Considered options

Using pino directly in every layer would couple the whole repository to one
library and make logging in a test awkward. A per-layer error hierarchy with no
shared base would force the boundary to know every layer's errors to answer
correctly. A single `core` package holding logging, errors, and whatever else
seemed common was rejected, because the one package every layer depends on has to
stay small enough that depending on it is free.

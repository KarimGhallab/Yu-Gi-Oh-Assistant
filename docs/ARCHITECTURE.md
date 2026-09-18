# Architecture

This is the single-context architecture for the Yu-Gi-Oh Assistant. It maps the
components and the flow of a turn, and it states the layer boundaries that the
dependency rules enforce. Those boundaries are normative: `depcruise` fails a
crossing. The vocabulary here is the one in [`GLOSSARY.md`](./GLOSSARY.md);
the product intent and constraints are in [`PRODUCT.md`](./PRODUCT.md).

## Components

### The applications

- **`apps/web`**, the client. A React single-page app (Vite, React Router,
  TanStack Query) that owns the chat: the sidebar, the conversation view, the
  readout, and the controls. It reads the API and streams one turn per request.
  It depends only on the `cards` and `contracts` packages, so it never reaches
  into the pipeline or the stores.
- **`apps/server`**, the API. A Hono application behind a small composition root
  that loads configuration once, guards the index, opens the SQLite store, and
  builds the Ollama client. It serves `/health`, `/api/conversations`,
  `/api/models`, and `/api/archetypes`, and it owns the turn stream. The same
  workspace also holds the `populate` and `rag:ask` commands, which run outside
  the HTTP server.

### The packages

| Package                 | Responsibility                                                                                                                    | May depend on                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `packages/cards`        | The card domain and the filter schema, the vocabulary parsing, retrieval, and the interface share.                                | (leaf)                           |
| `packages/contracts`    | The endpoint and turn-stream schemas, re-exporting the card vocabulary so the client names fields without importing the domain.   | cards, utils                     |
| `packages/ollama`       | The client to Ollama: chat, embeddings, and model listing.                                                                        | logger, utils                    |
| `packages/db`           | The read-only catalog port (a LanceDB adapter and an in-memory substitute), the SQLite application state, and the ingestion path. | cards, logger, ollama, utils     |
| `packages/rag`          | Retrieval and the two-stage pipeline: parse, retrieve, choose, answer.                                                            | cards, db, logger, ollama, utils |
| `packages/logger`       | The pino wrapper and the log levels.                                                                                              | utils                            |
| `packages/utils`        | Retained cross-cutting helpers and the typed domain error.                                                                        | (leaf)                           |
| `packages/test-support` | Fakes and fixtures for tests. Importable from test files only, never from an app.                                                 | other packages, never an app     |

Cross-package imports go through a package's entry point, enforced by its
`exports` map, so a package's internals stay its own.

### The two stores

- **The catalog** (the card index) lives in a LanceDB table named `cards` under
  `DATA_DIR/index`. It is built once by `populateCardIndex`, is read-only while
  the server runs, and holds one row per card entry per language partition. Its
  metadata records the dataset version, the embedding model, and the dimensions
  it was built with. Callers read it through one read-only `CardCatalog` port:
  production opens the LanceDB adapter with `openCardCatalog`, tests substitute
  the in-memory adapter at `@ygo-assistant/db/testing`, and the two are held to
  one contract test. Ingestion stays direct and is not on the port: a build
  replaces the whole table and runs before the server starts.
- **The application state** lives in SQLite at `DATA_DIR/app.db`. It holds
  conversations and messages, including the filters a turn searched with, the
  rewrite a parse recorded, and the ids of the cards a turn suggested. The store
  is injected, never reached as a singleton.

### Ollama

Ollama is an external service, local or on the network, reached over HTTP. The
server uses a chat model for parsing, judgement, and the answer, and an
embedding model for retrieval and ingestion. A model is never bundled: the
player pulls it into Ollama, and the application only names it. The boot guard
compares the index metadata with the configured embedding model and dimensions,
so a mismatched index fails at startup rather than answering badly.

## A turn, end to end

A turn is one exchange. It crosses every layer, and its order is the pipeline's
contract.

1. **The request.** The client sends `POST /api/conversations/:id/messages` with
   the player's words, the settings in force, and any edited filters, and reads
   the response as a server-sent event stream.
2. **Resolve and store.** The server resolves the conversation's settings against
   the per-turn overrides, stores the player's message, and opens the stream.
   Each frame is validated against the contracts before it is written.
3. **Parse** (`resolveSearch`). A request whose filters the player edited is taken
   at their word: the edited filters stand and the request becomes the free text,
   because parsing again would overwrite the correction. Otherwise the chat model
   parses the request into filters and an optional rewrite. A parse that leaves
   the search nothing of its own runs the search on the request itself and
   reports `free-text-only`.
4. **Search** (`retrieveCards`). The query is scoped to one language partition.
   With free text it is a semantic search, closest first; with filters only it is
   a scan in a stable identity order. Candidates are deduplicated by card id and
   the weak ones below `minScore` are dropped. `topK` bounds the ranking.
5. **Choose** (`selectCards`). The top of the ranking, the pool, is judged by the
   chat model (`filterCandidates`) against the player's own words, and the ids it
   keeps are returned in ranking order and trimmed to `shown`. A judgement that
   fails is not a failed turn: the ranking's own top `shown` cards stand as the
   fallback. A judgement that succeeds and keeps nothing is an honest empty
   result, not a fallback.
6. **Answer** (`streamGroundedAnswer`). The chat model streams prose written only
   from the suggested cards, at temperature 0, in the conversation's language.
   The cards are the whole of what it is given to talk about, which is what makes
   a suggested card impossible to invent.
7. **Store the reply.** When the answer is complete, the assistant's message is
   appended with the filters the turn searched with and the ids of the cards it
   offered. A turn that fails partway stores no reply: the question stays and the
   stream says what stage gave way.
8. **The frames.** The stream names its frames so the client can tell them apart
   by name rather than order: `turn.start`, `status`, `filters`, `cards`,
   `answer.delta`, `answer.end`, `turn.end`, and `error`. The suggested cards are
   emitted before the answer, so the grid can render while the prose arrives.

## Layer boundaries (normative)

The dependency rules in `.dependency-cruiser.cjs` are these boundaries, and each
one is an error rather than a warning:

- **Applications are leaves.** No module outside `apps/` may import anything
  under `apps/`, and `test-support` may never import an app.
- **Packages layer.** Each package may depend only on the packages listed in the
  table above. A new dependency is a decision, not a convenience: add it to the
  rule and to that package's manifest together.
- **Entry points only.** A cross-package import names the package, never a path
  inside it, so the `exports` map is the seam.
- **Production dependencies are declared.** Code outside a test file may import
  only from `dependencies`, never `devDependencies`.
- **No cycles.** A circular dependency is an error.
- **`test-support` is test-only.** Only `*.test.*` and `*.spec.*` files may import
  it.

The data layer follows the same spirit: `rag` reads the catalog through the
`CardCatalog` port that `db` exposes and never through LanceDB directly, and the
client reads the API through the `contracts` schemas rather than restating a
shape.

## Where things live

- `DATA_DIR` holds the catalog (`index/`) and the application state (`app.db`).
  Both are local, and the raw dump they were built from is not in the repository.
- `LOG_DIR` holds the rotating production log files; every record is mirrored to
  stdout.
- Configuration is read and validated once at boot from the environment, so a
  missing or invalid setting fails fast. The server binds loopback by default and
  is unauthenticated: conversation history is private because it is unreachable,
  not because it is protected.

## Deployment shapes

- **Development.** `pnpm dev` runs the API and a Vite dev server that proxies
  `/api` and `/health` to it, so the browser sees one origin and no CORS is
  needed.
- **Decoupled.** The client is built with `VITE_API_BASE_URL` pointing at the
  API, and the server lists the client's origin in `CORS_ORIGIN`.
- **Behind a reverse proxy.** One origin serves the built client and forwards
  `/api` and `/health` to the server, which is the shape the optional containers
  use. Ollama stays on the host.

## Decisions

Non-obvious technical decisions are recorded as ADRs in [`adr/`](./adr/). The
architecture above is the current state; an ADR is where the reasoning for
changing it belongs. The product's own scope and constraints are the product
doc's, and the report the app keeps about its own work is the tracker's.

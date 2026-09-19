# 53 - The client and the server run in containers

**What to build:** The server and the client each have an image definition, and
a compose file brings them up together on a machine with only podman, leaving
Ollama on the host and the populated index mounted. The pnpm scripts stay the
primary run path; the containers are the isolated alternative.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-18)

- [x] Each service has a `Containerfile`, named and built per the deployment
      guidelines: a pinned registry reference, separate build and runtime
      stages, and a runtime image carrying only production dependencies.
- [x] The images run as a non-root user on an unprivileged port and declare a
      healthcheck.
- [x] A root `.dockerignore` keeps secrets, caches, and build output out of the
      build context.
- [x] A root `compose.yaml` starts the server and the client together, reaches
      Ollama on the host, and mounts the populated index and the writable paths.
- [x] `podman-compose up --build` brings the app up and a request works end to
      end.
- [x] The README documents the container path while keeping the pnpm scripts
      primary.
- [x] The repository gates stay green.

**Notes:** The client bakes its API base at build time, so the container build
has to set it to the address the browser will use, the same constraint the
end-to-end harness works around. Ollama does not join the compose network; it is
reached on the host.

**Outcome:** `apps/server/Containerfile` builds the workspace on
`docker.io/library/node:26.5.0-alpine` with pnpm 12.4.2, compiles the server
with its packages, and copies them plus a production-only `node_modules` into a
runtime stage that runs as the `node` user on port 3000 with a healthcheck.
`apps/web/Containerfile` builds the client the same way and serves it from
`docker.io/nginxinc/nginx-unprivileged:1.27-alpine`, with `apps/web/nginx.conf`
serving the single-page app with a deep-link fallback and proxying `/api` and
`/health` to the server, buffering off and long timeouts for the streamed turn.
`compose.yaml` brings both up on a private network with loopback-published ports,
mounts `apps/server/data` as the index and store and a named volume for the
logs, reaches Ollama through `host.containers.internal`, and hardens both
services with a read-only root filesystem, a tmpfs, dropped capabilities,
`no-new-privileges`, and memory, PID, and CPU limits. Because podman's default
OCI image format drops the Containerfile `HEALTHCHECK`, the compose file also
declares healthchecks for both services. A root `.dockerignore` keeps
`node_modules`, `dist`, the card dump, logs, `.env`, and docs out of the build
context. The README gains an optional container section; the pnpm scripts remain
the primary path.

Verified by building both images and running them on a podman network: the
server booted against the real index and SQLite store, answered `/health` with
200, and returned stored conversations from `/api/conversations`; the client
served the shell, proxied `/health` and `/api/conversations` to the server, and
returned the shell for a deep link. Two limits of the environment are worth
naming. `podman-compose` is not installed here, so the two containers were run
with `podman` directly rather than through compose, and the compose file was
parsed but not executed. And a model-backed turn was not exercised, because the
host's Ollama listens on `127.0.0.1` only, which a container cannot reach
through the host gateway; the README now tells the reader to start it with
`OLLAMA_HOST=0.0.0.0`. The repository gates stay green: typecheck, 445 vitest
tests across 47 files, lint, and formatting.

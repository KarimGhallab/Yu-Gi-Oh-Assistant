# 53 - The client and the server run in containers

**What to build:** The server and the client each have an image definition, and
a compose file brings them up together on a machine with only podman, leaving
Ollama on the host and the populated index mounted. The pnpm scripts stay the
primary run path; the containers are the isolated alternative.

**Blocked by:** None - can start immediately.

**Status:** ready-for-agent

- [ ] Each service has a `Containerfile`, named and built per the deployment
      guidelines: a pinned registry reference, separate build and runtime
      stages, and a runtime image carrying only production dependencies.
- [ ] The images run as a non-root user on an unprivileged port and declare a
      healthcheck.
- [ ] A root `.dockerignore` keeps secrets, caches, and build output out of the
      build context.
- [ ] A root `compose.yaml` starts the server and the client together, reaches
      Ollama on the host, and mounts the populated index and the writable paths.
- [ ] `podman-compose up --build` brings the app up and a request works end to
      end.
- [ ] The README documents the container path while keeping the pnpm scripts
      primary.
- [ ] The repository gates stay green.

**Notes:** The client bakes its API base at build time, so the container build
has to set it to the address the browser will use, the same constraint the
end-to-end harness works around. Ollama does not join the compose network; it is
reached on the host.

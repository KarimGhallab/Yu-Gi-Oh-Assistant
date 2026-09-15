# 16 - Colorized dev logs and rotating production log files

**What to build:** The shared logger gains two environment-chosen sinks. In
development it colorizes logs for the terminal; in production the server writes
structured logs to rotating files and mirrors them to stdout, so a container
still surfaces them while the disk stays bounded. Rotation is done in-process
with `rotating-file-stream`, kept behind the logger package so no caller imports
pino. File logging applies to the server only; the one-off populate command
keeps console output, and running the server in a container needs a writable
volume for the log directory.

**Blocked by:** None - can start immediately.

**Status:** Resolved (2026-09-15)

- [x] The logger can emit colorized, human-readable logs for a terminal and
      structured JSON otherwise, without callers importing pino.
- [x] In production the server writes logs to rotating files under a configurable
      log directory, rotating at 10 MB and keeping 5 rotated files.
- [x] File logs are also written to stdout, so container logs remain available.
- [x] Development colorizes logs, production writes files, and test loggers that
      inject a destination are unchanged.
- [x] An injected destination takes precedence over the colorized and file sinks.
- [x] The log directory is configurable, documented in `.env.example`, and
      gitignored.
- [x] Build and lint pass.

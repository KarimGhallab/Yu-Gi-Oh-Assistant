# Issue tracker

This repo uses **local markdown**. There is no GitHub or GitLab issue tracker in
use, so the engineering skills read and write files under `docs/tracker/`. This
file is both the tracker convention and the issue board.

## Layout

| Kind            | Location                  | Shape                                                                    |
| --------------- | ------------------------- | ------------------------------------------------------------------------ |
| Reviewed issues | `docs/tracker/issues/`    | one file per issue, `NNN-slug.md`, board in this file                     |
| Specs           | `docs/tracker/specs/`     | one file per spec, `NN-slug.md`, from `/to-spec`, index in `SPECS_TRACKER.md` |
| Tasks / tickets | `docs/tracker/tasks/`     | one file per ticket, `NN-slug.md`, from `/to-tickets`, index in `TASKS_TRACKER.md` |

## Conventions

- Files carry a zero-padded numeric prefix when order matters.
- Tickets carry `Status` and `Blocked by` lines (see the `/to-tickets` local
  template).
- `/to-tickets` writes scratch tickets to `.scratch/<feature>/issues/`. Durable
  tickets are published to `docs/tracker/tasks/`.

## Labels and file shape

A file-based tracker has no native labels, so record them as lines near the top
of the issue file:

- `Status:` one triage state role (`needs-triage`, `needs-info`,
  `ready-for-agent`, `ready-for-human`, `wontfix`). The pre-triage archive uses
  its own vocabulary: `Open`, `Dispatched`, `Resolved`.
- `Category:` `bug` or `enhancement`, once categorised.

See `docs/TRIAGE_LABEL.md` for the role strings. Append triage conversation
under a `## Comments` heading at the bottom of the file.

This file is the board and the source of truth for state.

## Board

No issues yet.

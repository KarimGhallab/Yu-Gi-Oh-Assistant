# Triage labels

The skills speak in terms of five canonical triage roles. This file maps those
roles to the label strings used in this repo's tracker.

## State roles

Exactly one per triaged issue.

| Role              | Label             | Meaning                                  |
| ----------------- | ----------------- | ---------------------------------------- |
| `needs-triage`    | `needs-triage`    | Maintainer needs to evaluate this issue  |
| `needs-info`      | `needs-info`      | Waiting on reporter for more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified, ready for an AFK agent  |
| `ready-for-human` | `ready-for-human` | Requires human implementation            |
| `wontfix`         | `wontfix`         | Will not be actioned                     |

## Category roles

Exactly one per categorised issue.

| Role          | Label         | Meaning                    |
| ------------- | ------------- | -------------------------- |
| `bug`         | `bug`         | Something is broken        |
| `enhancement` | `enhancement` | New feature or improvement |

When a skill mentions a role (for example "apply the AFK-ready triage label"),
use the corresponding label string from these tables. Edit the mapping if the
tracker vocabulary changes.

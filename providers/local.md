# Local provider

Default (`backlog.provider: local`, or key missing). Backlog = files in repo: `{backlog}` index (order = priority) + `{tasks}/<slug>.md` (frontmatter carry state). One agent, one checkout — no locks, no hooks. Behavior = what the skills describe when no provider named; this file only maps it onto **providers/CONTRACT.md**.

## States

Local keeps its own finer statuses in task frontmatter `status:`. Mapping onto contract states:

| Contract | Local |
|---|---|
| `todo` | `status: todo`, `grilled: false` |
| `grilling` | — (transient, lives in `/wa-task` session only) |
| `grilled` | `status: todo`, `grilled: true` |
| `coding` | `status: in-progress` / `review` / `validated` |
| `ready-to-merge` | — (`/wa-close` with `close.strategy: pr` go straight to `done`) |
| `done` | `status: done` |

## Verbs

| Verb | Local implementation |
|---|---|
| `list` | read `{backlog}` sections in order, frontmatter of each linked task |
| `get` | read `{tasks}/<slug>.md` |
| `create` | write `{tasks}/<slug>.md` from `templates/task.md`, append line under **Todo** in `{backlog}` |
| `claim` | no-op — single agent. Set `status: in-progress` when coding starts |
| `release` | no-op |
| `set-state` | edit frontmatter `status:` (+ move line to matching `{backlog}` section) |
| `move` | reorder lines inside `{backlog}` section |
| `set-field` | edit frontmatter `size:` / `sprint:` |
| `comment` | no-op |
| `claims` | always empty |
| `branch` | `<branch.prefix><slug>` when `branch.per_task`, else current branch |

Ticket ids are slugs here, not numbers; `/wa-board` display indexes resolve to slugs.

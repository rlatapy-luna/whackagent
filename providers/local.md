# Local provider

Default (`backlog.provider: local`, or key missing). Backlog = files in repo: `{backlog}` index (order = priority) + `{tasks}/<slug>.md` (frontmatter carry state). One agent, one checkout — no locks, no hooks. Behavior = what the skills describe when no provider named; this file only maps it onto **providers/CONTRACT.md**.

## States

Local keeps its own finer statuses in task frontmatter `status:`. Mapping onto contract states:

| Contract | Local |
|---|---|
| `todo` | `status: todo`, `grilled: false` |
| `grilling` | — (transient, lives in `/wa-grill` session only) |
| `grilled` | `status: todo`, `grilled: true` |
| `coding` | `status: in-progress` / `review` / `validated` |
| `review` | — (`/wa-close` with `close.strategy: pr` go straight to `done`) |
| `done` | `status: done` |

Local `status: review` sits inside contract `coding` (coded, verifier not run) — not contract `review`.

## Verbs

| Verb | Local implementation |
|---|---|
| `list` | read `{backlog}` sections in order, frontmatter of each linked task. `--milestone` filters on `milestone:` |
| `get` | read `{tasks}/<slug>.md` |
| `create` | write `{tasks}/<slug>.md` from `templates/task.md`, append line under **Todo** in `{backlog}`. `milestone:` = `--milestone`, else last entry of `backlog.milestones`, else empty |
| `claim` | no-op — single agent. Set `status: in-progress` when coding starts |
| `release` | no-op |
| `set-state` | edit frontmatter `status:` (+ move line to matching `{backlog}` section) |
| `move` | reorder lines inside `{backlog}` section |
| `set-field` | edit frontmatter `size:` / `sprint:` / `milestone:` |
| `close-milestone` | remove entry from `backlog.milestones` (tasks keep `milestone:`) |
| `milestones` | config `backlog.milestones` (open, oldest first) reversed, then `milestone:` values not in that list whose tasks aren't all `done`/`canceled` (closed); counts from task files, `done` = `status: done`/`canceled` |
| `comment` | no-op |
| `depend` | task `note:` `Depends on …` line (graph lives in text) |
| `claims` | always empty |
| `branch` | `<branch.prefix><slug>` when `branch.per_task`, else current branch |

Ticket ids are slugs here, not numbers; `/wa-board` display indexes resolve to slugs.

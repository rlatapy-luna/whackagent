# 0003 · .lunabee/agents folder

Default home moved `.whackagent/` → `.lunabee/agents/` (config, backlog, tasks, wiki, reports, conventions), default `branch.prefix` `wa/` → `feature/`. Until this runs, every skill, the backlog pane and `wa-backlog` stop on the old layout (**reference/paths.md**, *Config file*); this moves it.

## Detect

`.whackagent/config.md` exists, `.lunabee/agents/config.md` doesn't.

## Plan

Shared board (GitHub, Plane) → first `gh pr list --head lb-setup/agents-folder --state open --json number`: one open → row `0003 .lunabee/agents folder : waiting on PR #<n>`, no answer asked, nothing moved. Else `0003 .lunabee/agents folder : move .whackagent/ → .lunabee/agents/ (<n> files)`, then one line per item: `config.md` · each `paths.*` key resolving under `.whackagent/` (set or missing) → `.whackagent/wiki → .lunabee/agents/wiki`. Keys pointing elsewhere not listed, never moved. Non-local board → `tasks stays .whackagent/tasks (pinned)` line. `branch.prefix` missing → `branch.prefix pinned "wa/"` line. Answers:

- `yes` (recommended: one folder at new default, every skill runs again) → Apply.
- `skip` → nothing moved, offered again next reconfigure.

`.lunabee/agents/` already holds a listed name (`wiki/`, `BACKLOG.md`, …) → that line `⚠️ .lunabee/agents/wiki exists`, stop row on yes, ask: merge, other path, or skip. Never overwrite, never mix two wikis.

## Apply

1. Move each listed item to same relative spot under `.lunabee/agents/`: `git mv` when tracked, plain move otherwise, parent folders first. Non-local board → `{tasks}` stays: task files live on ticket branches, `LB_TASKS_PATH` and `BOARD.md` name it.
2. Config, now `.lunabee/agents/config.md`, edited in place: each `paths.*` value starting `.whackagent/` → `.lunabee/agents/`, except pinned tasks. Non-local board, `paths.tasks` missing → write `tasks: .whackagent/tasks`. `branch.prefix` missing → write `prefix: "wa/"`: open branches, caller `branches:` filter, `LB_BRANCH_PREFIX` keep matching. Every other key byte-for-byte.
3. `.gitignore` lines naming moved paths (reports) → rewritten to `.lunabee/agents/…`.
4. Other repo files naming `.whackagent/` (`CLAUDE.md`, `AGENTS.md`, README) → list `file:line`, rewrite on yes.
5. Leftovers in `.whackagent/` not listed → name them, ask. Folder empty → remove it.
6. Shared board (GitHub, Plane) → move lands through PR on branch `lb-setup/agents-folder`, like scaffold: teammates' agents stop with the old-layout notice until it merges.

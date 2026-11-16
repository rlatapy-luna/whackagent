# 0004 · Lunabee names

Project files name only Lunabee things: comments written from plugin templates named `whackagent`, `/wa-*` commands and `wa-*` agents. Now reworded as steps (`code step`, `verifier`, `implementer`), as in current templates. Board data (variables, labels, claim refs, workflow, CLI, open PRs) renamed by *Take stock* step 7, *Lunabee names*, never here.

## Detect

Any of, in plugin-written text only (comments, headers), never in user prose:

- `.lunabee/agents/config.md` (legacy `.whackagent/config.md`): a `#` comment naming `whackagent`, `/wa-<step>`, `wa-implementer`, `wa-verifier` or `wa-backlog`.
- `{conventions}/**/*.md` copied from plugin: line `> whackagent convention module …`, or `wa-implementer` / `wa-verifier` in a module whose plugin twin (`${CLAUDE_PLUGIN_ROOT}/conventions/…`, same path) no longer has them.
- `{backlog}` header lines (above first `##`) or `<!-- … -->` section comments naming `/wa-<step>`.
- `{tasks}/*.md` (local provider): template `<!-- … -->` comments under section headings naming `/wa-<step>` or `wa-*` agents.
- `{wiki}/index.md`: header line naming `/wa-wiki`.

## Plan

`0004 Lunabee names : <n> files reworded`, one line per file with its count (`config.md — 31 comments` · `conventions/swift/style.md — header`). Answers: `yes` (recommended: teammates without whackagent see only Lunabee names, values and prose untouched) · `skip`.

## Apply

1. Each matched line → same line from current template (`${CLAUDE_PLUGIN_ROOT}/templates/config.md` for same key, `task.md`, `BACKLOG.md`, `wiki-index.md`, plugin module's same line). No template twin (comment user extended) → reword in place only: `/wa-<step>` → `<step> step` (`/wa-code` → `code step`, `/wa-setup` → `setup`, `/wa-grill` → `grill`, `/wa-autopilot` → `autopilot`, `/wa-board` → `board view`), `wa-implementer` → `implementer`, `wa-verifier` → `verifier`, `wa-backlog` → `lb-backlog`, `whackagent` → `agents`.
2. Config values, keys, user comments without those names, task frontmatter values, sections' content, convention rules: byte-for-byte.
3. Legacy `.whackagent/` layout: config read and edited where it is; folder move = migration 0003.

---
name: wa-review
description: Standalone code review — diff, path, branch or whole project, four lenses. --fix to autofix.
---

# /wa-review

Standalone review — audit existing code, diff, or whole project. Same engine as `/wa-code` verify phase, usable anywhere.

Read `${CLAUDE_PLUGIN_ROOT}/reference/`: `voice.md` `paths.md` · `--fix` → + `findings.md` · `<branch>` arg under `backlog.provider` ≠ `local` → + `code-github.md`.

Wording (screen + reports): **reference/voice.md** — telegraphic, tech terms stay English.

## Scope (argument)

- **`/wa-review`** → current working diff (git diff vs HEAD / staged).
- **`/wa-review <path>`** → that file or directory.
- **`/wa-review <branch>`** → diff of that branch vs base. GitHub provider ticket branch → ticket range (`git diff $start^ <branch>`, **reference/code-github.md**, *Squash merge*), never `<base>..HEAD`.
- **`/wa-review --all`** → whole project source.

## Conventions

- `.whackagent/config.md` exists: use its `review.modules`, resolved per **reference/paths.md** (*Convention modules*), + toggles.
- No config (fresh existing project): detect language + kind, fall back to plugin defaults in `${CLAUDE_PLUGIN_ROOT}/conventions/` — multi-module pack (`swift/`, `kotlin/`: style, elegance, testing, architecture-global, matching architecture-\*, UI module — `swiftui.md`/`compose.md` — only if project use that toolkit), or single `<lang>.md`, else `generic.md`. Tell user it run on defaults; suggest `/wa-setup` to customize.
- Glossary: config present and `{wiki}/glossary.md` exists → pass its path to verifier and `--fix` implementer. Absent → nothing.

## Do

1. Resolve scope + changed/target files.
2. **Dispatch one **wa-verifier**.** **Note `agentId`** — how later rounds resume it. Pass modules (`review.modules` per **reference/paths.md**), target files **plus diff hunks when scope is diff**, and toggles.
   **Plus focused verifiers** (`review.focus`), same message, per **wa-code → 3. Verify**, *Focused verifiers*. `when` matched against diff hunks, or target files' content when scope has no diff (`<path>`, `--all`). No config → none.
3. **Check `LENSES:` lines** — main: `style`, `elegance`, `structure`, `correctness`, all four ✓; focused: its topic ✓. Missing one goes back for that lens alone. Then show findings severity-ordered, grouped by lens tag (focus name = own group).
4. **Fix?**
   - Default → **report only**. No mutate existing code unasked.
   - `--fix` → dispatch **wa-implementer** in **fix mode** with aggregated findings + modules (tell it: check each finding before fixing, fix only what holds, re-read style, add no comments), note `agentId`, then re-review. Rejections go back to verifier with their evidence, disputed ones leave loop and go to user (**reference/findings.md**). Loop until clean or no progress (cap 3 rounds). `BLOCKED:` → stop and ask.
   - **Rounds 2+ resume same agent by id** instead of respawn — per **`/wa-code` → step 3** (delta only, anti-stale warning, respawn fresh past 3 rounds, fall back to fresh spawn if id lost).
5. If invoked on whackagent task (path is task files), record findings in task `## Review`.

## Lenses

**style** — how written. **elegance** — idiomatic for project language, not patterns ported from another. **structure** — layers, boundaries, naming, file tree. **correctness** — real bugs, and whether code does what it claims. One agent sweep all four: isolated agent cost ~50k tokens context before it read a line, and every lens judge same diff against same rulebook. Cost of one agent: forgetting lens now silent — that what `LENSES:` line is for. Topic it keep missing anyway → project lists it in `review.focus`: own verifier, own context, that topic only.

## Note

For in-flow review of task you build, use **`/wa-code`** — its step 3 is same review with autofix on. `/wa-review` is standalone entry point.
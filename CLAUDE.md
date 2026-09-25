# whackagent

Claude Code plugin that runs a dev workflow (backlog, wiki, task lifecycle) in the projects it is installed in. The repo is Markdown prompts that Claude reads at run time, with one exception: backlog providers under `providers/` may ship a script and CI workflow (for example `providers/github/wa-backlog`, Python 3 stdlib plus `gh`). There is no build and no test suite; provider scripts are tested against a real tracker (see the playground below).

## Layout

- `.claude-plugin/plugin.json`: plugin manifest. Registers every skill in `skills[]`.
- `.claude-plugin/marketplace.json`: marketplace entry. Carries the version twice (`metadata.version` and `plugins[0].version`).
- `skills/wa-*/SKILL.md`: the user commands (`/wa-setup`, `/wa-task`, `/wa-code`, `/wa-feedback`, `/wa-validate`, `/wa-close`, `/wa-autopilot`, `/wa-board`, `/wa-review`, `/wa-wiki`).
- `agents/`: the only two subagents. `wa-implementer` writes code. `wa-verifier` is read-only and reviews the diff on four lenses (style, elegance, structure, correctness).
- `conventions/`: rule modules that `/wa-setup` copies into the target project. Swift and Kotlin are multi-module packs with the same file names; TypeScript and generic (fallback for every other language) are one file each.
- `templates/`: files `/wa-setup` and `/wa-task` scaffold in the target project (`config.md`, `task.md`, `BACKLOG.md`, `wiki-index.md`). Skills reach them through `${CLAUDE_PLUGIN_ROOT}/templates/`.
- `providers/`: backlog providers. `CONTRACT.md` defines the verbs and the six states (`todo`, `grilling`, `grilled`, `coding`, `review`, `done`) every skill uses. `local.md` maps the default file-based backlog onto it; `github/` holds the `wa-backlog` script, the `whackagent-board.yml` hooks workflow and its README.
- `README.md`: public doc on GitHub. No agent reads it.

## Task lifecycle

`todo → in-progress → review → validated → done` (or `canceled`).

- `/wa-code` sets `review`: coded, waiting for the user to test.
- `/wa-validate` sets `validated`: the user approved the spec and the verifier ran.
- `/wa-close` sets `done`: commits and lands the branch.

Keep each step's ownership intact when editing. For example, only `/wa-close` commits in attended runs (`/wa-autopilot` commits on its own task branch only), and the orchestrator skills never write code themselves.

## Rules when editing

- **Platform-neutral engine.** Skills, agents and templates must work the same for iOS, Android, web, desktop, server, CLI and libraries. Platform- or language-specific rules belong in `conventions/`; platform-specific tooling (XcodeBuildMCP, `./gradlew`, mobile-mcp, browser MCP) appears only as one entry of a per-platform list, never as the default path.

- **English only**, in every file. The target project's chat language is a runtime setting (`discussion_language`), not something the repo is written in.
- **Skills, agents, conventions and templates are caveman-compressed** (terse, no articles, fragments). Match that style when editing them. `README.md` and this file stay in normal prose.
- **Task file section headings are an API.** Skills look them up by exact name: `## Context / Decisions`, `## Acceptance criteria`, `## Implementation`, `## Review`, `## Verification`, `## Feedback`. Renaming one means updating `templates/task.md`, every skill and agent that cites it, and the README task example.
- **Cross-references use `**<skill> → <Section>**`** (e.g. `**wa-board → Voice**`, `**wa-board → Paths**`, `**wa-code → Report card**`). Renaming a section heading means grepping for its references.
- **Canonical definitions live in one place.** Voice, display format, task indexes, paths and sprints are defined in `wa-board`. The report card is defined in `wa-code`. Other skills point there rather than restating.
- **Never hardcode `.whackagent/` paths** for backlog, tasks, wiki, reports or conventions. Use the `{backlog}` `{tasks}` `{wiki}` `{reports}` `{conventions}` placeholders, resolved from `paths:` in the config. Only `.whackagent/config.md` is fixed.
- **Subagents never read the config.** The orchestrating skill passes them what they need (build commands, `verify.mode`, module paths).
- **Every question to the user carries a recommended answer** plus a one-line reason. Keep that rule in any new prompt that asks something.

## Backlog providers

- Skills must speak only the contract verbs and states, never tracker terms. The canonical rules for providers live in `wa-board` under "Backlog provider"; each skill that behaves differently under GitHub has its own "GitHub provider" section.
- Under the GitHub provider, agents only write `grilling` and `coding`, always through an atomic `claim`. `grilled`, `review` and `done` are set by the hooks workflow from repository events. Don't add a skill step that sets them directly.
- A new tracker means a new `providers/<name>/` folder implementing the same verbs, states and exit codes, plus whatever automation moves the data-driven states.
- Test provider changes in the playground repo `rlatapy-luna/whackagent-playground` (worktree `~/dev/whackagent-playground-worktrees/cocorico`, Project #1). The workflow must be merged on its default branch to react to `issues` events.

## Adding things

- **New skill**: create `skills/<name>/SKILL.md` with `name` and `description` frontmatter, register it in `plugin.json` `skills[]`, add it to the README command table.
- **New config key**: add it with its default and a comment to `templates/config.md`, add the question to `/wa-setup`, document it in the README. The `/wa-setup` reconfigure mode diffs the project config against the template, so existing projects get offered the new key automatically. Omitting a key must keep the old behavior.
- **New convention module**: add the file under `conventions/<language>/`, teach `/wa-setup` when to copy it, list it in the README.

## Releasing

Bump the version in all three places, `plugin.json` and both fields of `marketplace.json`, in one `chore: release X.Y.Z` commit.

## Commits

Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, optional scope such as `feat(review):`). The subject says what changed for the user of the plugin.

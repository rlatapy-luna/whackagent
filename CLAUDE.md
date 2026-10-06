# whackagent

Claude Code plugin that runs a dev workflow (backlog, wiki, task lifecycle) in the projects it is installed in. The repo is Markdown prompts that Claude reads at run time, with two exceptions: backlog providers under `providers/` may ship a script and CI workflow (for example `providers/github/wa-backlog`, Python 3 stdlib plus `gh`), and `hooks/` holds the backlog pane, a TypeScript function-hooks module. There is no build. Provider scripts are tested against a real tracker (see the playground below); the pane's parsing and view logic is tested with `claude plugin test .`, and `claude plugin validate .` checks the module the way Claude Code loads it.

## Layout

- `.claude-plugin/plugin.json`: plugin manifest. Registers every skill in `skills[]`.
- `hooks/`: the backlog pane (`/wa-pane`), loaded through `hooks/hooks.json`. `board.ts` is pure parsing and view logic (config, `{backlog}`, task frontmatter, `wa-backlog list` rows) with its tests in `board.test.ts`; `register.tsx` reads files and runs the provider, keeps the board in session state and draws it. It follows **wa-board → Display format** and **GitHub board**: change the pane when those change. `types/index.d.ts` declares its state, named in `plugin.json` as `types`.
- `.claude-plugin/marketplace.json`: marketplace entry. Carries the version twice (`metadata.version` and `plugins[0].version`).
- `skills/wa-*/SKILL.md`: the user commands (`/wa-setup`, `/wa-task`, `/wa-grill`, `/wa-code`, `/wa-feedback`, `/wa-validate`, `/wa-close`, `/wa-release`, `/wa-autopilot`, `/wa-board`, `/wa-review`, `/wa-wiki`).
- `agents/`: the only two subagents. `wa-implementer` writes code. `wa-verifier` is read-only and reviews the diff on four lenses (style, elegance, structure, correctness).
- `conventions/`: rule modules that `/wa-setup` copies into the target project. Swift and Kotlin are multi-module packs with the same file names; TypeScript and generic (fallback for every other language) are one file each.
- `templates/`: files `/wa-setup` and `/wa-task` scaffold in the target project (`config.md`, `task.md`, `BACKLOG.md`, `wiki-index.md`). Skills reach them through `${CLAUDE_PLUGIN_ROOT}/templates/`.
- `providers/`: backlog providers. `CONTRACT.md` defines the verbs and the six states (`todo`, `grilling`, `grilled`, `coding`, `review`, `done`) every skill uses. `local.md` maps the default file-based backlog onto it; `github/` holds the `wa-backlog` script, the `whackagent-board.yml` hooks workflow and its README.
- `.github/workflows/board.yml`: the board hooks logic, a reusable workflow every project calls through the `hooks-v1` tag. `providers/github/whackagent-board.yml` is the caller `/wa-setup` installs; keep its triggers and permissions in sync with what `board.yml` needs.
- `README.md`: public doc on GitHub. No agent reads it.
- `GITHUB.md`: public walkthrough of the GitHub provider across the whole workflow. No agent reads it; keep it in sync when a skill's GitHub provider section changes.
- `CHANGELOG.md`: public release notes, Keep a Changelog format, newest first. No agent reads it.

## Task lifecycle

`todo → in-progress → review → validated → done` (or `canceled`).

- `/wa-code` sets `review`: coded, waiting for the user to test.
- `/wa-validate` sets `validated`: the user approved the spec and the verifier ran.
- `/wa-close` sets `done`: commits and lands the branch.

Keep each step's ownership intact when editing. For example, only `/wa-close` commits task work in attended runs (`/wa-autopilot` commits on its own task branch only; `/wa-release` commits, tags and pushes only what the project's release doc says, each outward step confirmed), and the orchestrator skills never write code themselves.

## Rules when editing

- **Platform-neutral engine.** Skills, agents and templates must work the same for iOS, Android, web, desktop, server, CLI and libraries. Platform- or language-specific rules belong in `conventions/`; platform-specific tooling (XcodeBuildMCP, `./gradlew`, mobile-mcp, browser MCP) appears only as one entry of a per-platform list, never as the default path.

- **English only**, in every file. The target project's chat language is a runtime setting (`discussion_language`), not something the repo is written in.
- **Skills, agents, conventions and templates are caveman-compressed** (terse, no articles, fragments). Match that style when editing them. `README.md` and this file stay in normal prose.
- **Task file section headings are an API.** Skills look them up by exact name: `## Context / Decisions`, `## Acceptance criteria`, `## Implementation`, `## Review`, `## Verification`, `## Feedback`. Renaming one means updating `templates/task.md`, every skill and agent that cites it, and the README task example.
- **Cross-references use `**<skill> → <Section>**`** (e.g. `**wa-board → Voice**`, `**wa-board → Paths**`, `**wa-code → Report card**`). Renaming a section heading means grepping for its references.
- **Canonical definitions live in one place.** Voice, display format, task indexes, paths, sprints and pull requests are defined in `wa-board`. The report card is defined in `wa-code`. Other skills point there rather than restating.
- **Never hardcode `.whackagent/` paths** for backlog, tasks, wiki, reports or conventions. Use the `{backlog}` `{tasks}` `{wiki}` `{reports}` `{conventions}` placeholders, resolved from `paths:` in the config. Only `.whackagent/config.md` is fixed.
- **Subagents never read the config.** The orchestrating skill passes them what they need (build commands, `verify.mode`, module paths).
- **Every question to the user carries a recommended answer** plus a one-line reason. Keep that rule in any new prompt that asks something.

## Backlog providers

- Skills must speak only the contract verbs and states, never tracker terms. The canonical rules for providers live in `wa-board` under "Backlog provider"; each skill that behaves differently under GitHub has its own "GitHub provider" section.
- Under the GitHub provider, agents only write `grilling` and `coding`, always through an atomic `claim`. `grilled`, `review` and `done` are set by the hooks workflow from repository events. Don't add a skill step that sets them directly.
- A new tracker means a new `providers/<name>/` folder implementing the same verbs, states and exit codes, plus whatever automation moves the data-driven states.
- Test provider changes in the private playground repo `rlatapy-luna/whackagent-playground-2` (user Project #5). The old `rlatapy-luna/whackagent-playground` now redirects to a real team repo: never test there, and check `gh api repos/<repo> --jq .full_name` before any live write. The workflow must be merged on its default branch to react to `issues` events.

## Adding things

- **New skill**: create `skills/<name>/SKILL.md` with `name` and `description` frontmatter, register it in `plugin.json` `skills[]`, add it to the README command table.
- **New config key**: add it with its default and a comment to `templates/config.md`, add the question to `/wa-setup`, document it in the README. The `/wa-setup` reconfigure mode diffs the project config against the template, so existing projects get offered the new key automatically. Omitting a key must keep the old behavior.
- **New convention module**: add the file under `conventions/<language>/`, teach `/wa-setup` when to copy it, list it in the README.

## Changelog

Always update `CHANGELOG.md` in the same commit as any change a plugin user would notice (new or changed skill, config key, provider verb, hooks template version, convention module, removed behavior). Add one line under `## [Unreleased]`, in the matching `### Added`, `### Changed`, `### Fixed` or `### Removed` group, written for the plugin user rather than as a commit summary. Mark breaking changes with **Breaking:**. Internal-only edits (typos, this file, rewording with no behavior change) need no entry.

## Releasing

Bump the version in all three places, `plugin.json` and both fields of `marketplace.json`, in one `chore: release X.Y.Z` commit. The same commit renames `## [Unreleased]` in `CHANGELOG.md` to `## [X.Y.Z] - YYYY-MM-DD` and adds a fresh empty `## [Unreleased]` above it.

After pushing the release commit, move the hooks tag onto it (`git tag -f hooks-v1 && git push -f origin hooks-v1`): every project's caller runs `board.yml` from that tag, so this is what ships hook changes. Test `board.yml` on the playground first. A change callers must follow (new trigger, permission or secret) gets a new tag `hooks-v2` plus a caller template version bump, never a move of `hooks-v1`.

## Commits

Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, optional scope such as `feat(review):`). The subject says what changed for the user of the plugin.

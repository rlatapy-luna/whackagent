# Changelog

All notable changes to whackagent are listed here, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/) (pre-1.0: a minor bump can change behavior).

## [Unreleased]

## [0.24.1] - 2026-10-02

### Changed

- GitHub provider: feedback round comments on the ticket and PR now hold a line permalink to the round in the task file, which GitHub shows as an embedded snippet, instead of a copy of the text. The task file stays the source of truth.

## [0.24.0] - 2026-10-02

### Added

- GitHub provider: each `/wa-feedback` round is posted as a comment on the ticket and on its PR (your notes, triage, what changed, verdicts), from the task file's new `### Round <n>` block in `## Feedback`. Ships through the `hooks-v1` tag. Hooks template version 15 grants `pull-requests: write` so the PR comment comes from github-actions; older callers post it with `WA_PROJECT_TOKEN`. Run `/wa-setup backlog` to upgrade.

## [0.23.0] - 2026-10-02

### Changed

- GitHub board hooks are now a reusable workflow in the whackagent repo: projects keep a small caller (hooks template version 14) and get hook fixes with every whackagent release, without a PR. Run `/wa-setup backlog` once to replace the old full copy.

## [0.22.0] - 2026-10-02

### Changed

- `/wa-grill` searches for existing libraries and SDKs before settling on a hand-rolled integration, parser or protocol client, and records the survey in `## Context / Decisions`.
- A grill split on GitHub keeps the split ticket: it becomes the sprint's parent issue (new `split` verb), keeping its number, history and milestone, and the child tickets become its sub-issues. It used to be closed and replaced by a new sprint issue. Sprint names are now the kebab-case of the parent issue title, so a parent can keep a readable title. Hooks template version 13: run `/wa-setup backlog` to upgrade.

## [0.21.0] - 2026-10-01

### Changed

- New tasks join the open milestone with the highest title in version order (digit runs compared as numbers, so `0.10.0` > `0.9.0`), creation order breaking ties, instead of the most recently created one. A late patch milestone (`0.2.1` opened after `0.3.0`) stays current scope. Same rule for the local and GitHub providers; `milestones` lists highest first; `/wa-release` suggests the lowest open one.

## [0.20.0] - 2026-10-01

### Added

- `pr:` config block shapes every PR whackagent opens (ticket draft, `/wa-close` PR, sprint PR): repo PR template filled from the task file, title, labels, assignees, reviewers and a rules doc. whackagent's part of the body sits in a marked block that refreshes rewrite alone, so human edits stay. Reviewers are requested when the PR goes ready, never on a draft.
- `/wa-setup` detects lint tools applied through Gradle plugins (detekt, ktlint, spotless, company wrappers included) in build files or the version catalog.

### Changed

- Reports are gitignored, never versioned. `/wa-setup` adds `{reports}` to `.gitignore` at scaffold; reconfigure offers it and offers to untrack reports already committed.

### Fixed

- `/wa-validate` appends a validation round to the task report (tool and verifier findings, autofix changes, final status), so the report no longer shows unreviewed code.

## [0.19.1] - 2026-10-01

### Fixed

- GitHub board hooks run on `actions/github-script` v9 (hooks template version 12).

## [0.19.0] - 2026-10-01

### Added

- `tools:` config key declares project commands (detekt, SwiftLint, ESLint, ruff…) with a `when` stage. At `code`, the implementer runs them after build and tests, and failures in touched files count as a red build. At `validation`, `/wa-validate` runs them before the verifier and feeds failures into the autofix loop as `tool:<name>` findings. Failures in untouched files are reported as pre-existing, never fixed. `/wa-setup` detects tool configs and proposes entries.
- `GITHUB.md`: walkthrough of the GitHub provider across the whole workflow.
- GitHub provider: after decomposition, `/wa-code` posts the bricks as one ticket comment.

### Changed

- `/wa-board` runs on Haiku; `/wa-code` and `/wa-autopilot` run on Opus.
- GitHub provider: a winning claim assigns the current account, and an issue assigned to another account is reserved (`claim` exits 3 naming the assignee). `release` removes the assignment only when the claim made it. `list`/`get` expose `assignees` and `reserved`; new `whoami` verb.

## [0.18.0] - 2026-09-30

### Changed

- GitHub provider: a sprint is a parent issue labeled `wa-sprint` with its tickets as sub-issues, so GitHub shows sprint progress natively. The parent stays off the board and can't be claimed. Hooks (template version 11) skip it on open and close it when the sprint lands. New repo variable `WA_SPRINT_PREFIX`, set by `provision`.

## [0.17.0] - 2026-09-30

### Added

- Milestones as release scope, for both backlogs (local: `backlog.milestones` in config; GitHub: repo milestones). New contract verbs: `milestones`, `list`/`create --milestone`, `set-field milestone`, `close-milestone`. New tasks join the newest open milestone.
- `/wa-release <milestone>`: checks the milestone's tasks landed, then follows the project's documented release flow (`release.doc`, found in Markdown, or written with the user first), confirming every outward step.

### Changed

- GitHub provider: the sprint moves to a `sprint:<name>` label, and the hooks no longer close milestones (template version 10).

## [0.16.0] - 2026-09-29

### Changed

- `wa-implementer` runs on Sonnet.

## [0.15.1] - 2026-09-29

### Fixed

- `/wa-task` never starts `/wa-grill`: it creates the task, then suggests `/wa-grill <#>`. An existing task passed to `/wa-task` is no longer forwarded to `/wa-grill`.
- GitHub provider: `/wa-feedback`, `/wa-validate`, `/wa-close` and later `/wa-code` rounds rewrite the PR description from the task file after pushing (current decisions, acceptance criteria checklist, status line). The Screenshots section is kept.
- README flow and plugin descriptions show the grill step.

## [0.15.0] - 2026-09-28

### Changed

- **Breaking:** `/wa-task` is split in two. `/wa-task` creates, cuts and places tasks: an idea becomes one task, a spec is cut into a few feature-sized tasks carrying their spec excerpt, no argument runs the prioritization pass. `/wa-grill` grills one existing task, writes its acceptance criteria and owns the GitHub grilling claim, branch and spec push.

### Removed

- `/wa-spec`: folded into `/wa-task`.

## [0.14.2] - 2026-09-28

### Changed

- `/wa-spec-to-tasks` renamed to `/wa-spec`. `/wa-task` given a spec document (file, URL or pasted doc) follows the `/wa-spec` rules.

## [0.14.1] - 2026-09-28

### Changed

- Plugin author set to Rémi Latapy, with the original author credited in the README and an MIT `LICENSE` carrying both copyrights.

## [0.14.0] - 2026-09-28

### Added

- `/wa-spec-to-tasks`: cuts a large spec at feature seams into a few tasks sharing one sprint, each carrying its spec excerpt. A focused spec becomes one task, whose grill starts from the excerpt.

## [0.13.0] - 2026-09-28

### Added

- Optional git worktree per task, at `{worktrees}/<slug>` (`paths.worktrees`, default `../<repo>-worktrees`, refused inside the repo). The main checkout never switches branch. Rules live in `wa-board → Worktrees`.
- GitHub provider: the grilled board comment links the spec file (hooks template version 9).

## [0.12.0] - 2026-09-26

### Added

- Pluggable backlog provider layer. `local` stays the default; `github` moves the backlog onto a GitHub Project so several agents in different worktrees share one board.
  - `providers/CONTRACT.md`: provider-neutral verbs, six states (`todo`, `grilling`, `grilled`, `coding`, `review`, `done`) and exit codes.
  - `providers/github/wa-backlog` (Python 3 stdlib + `gh`): atomic claims through `refs/wa-claims/<issue>/<phase>`, board listing in priority order, create/move/size/sprint, dependencies (`depend`, `blocked_by`), `link-pr`, PR screenshots through the `gh-image` extension, stale-claim detection and `provision`.
  - `providers/github/whackagent-board.yml`: hooks workflow that moves `grilled`, `review` and `done` from repository events.
  - GitHub sections in every skill, and `backlog.provider` config key. `/wa-setup` asks for the provider first, provisions the board and migrates a local backlog.
- `/wa-autopilot` on GitHub: draft PR delivery, stacking on an unlanded blocker, conflicting PRs rebased at round end, `/wa-validate` run before delivery (a validated ticket ships as a ready PR carrying the wiki update), and an AFK mode that runs the whole backlog with chain siblings coded in parallel.
- `WORKFLOW.md`: the ticket state machine, with Mermaid graphs.
- Kotlin convention pack (`conventions/kotlin/`: style, elegance, architecture global/app/package, compose, testing).
- `CLAUDE.md` for contributors.

### Changed

- Platform-neutral pipeline. Build uses whatever tool the repo uses (XcodeBuildMCP, `./gradlew`, SwiftPM, package scripts, cargo, go, dotnet, mvn, make). The runtime check picks its driver from `verify.platform` (`ios`, `android`, `web`, `desktop`, `server`, `cli`, `none`, or a list). `/wa-setup` detects Kotlin/Gradle, project kinds and UI toolkit, and supports two packs in a polyglot repo. Config defaults are neutral.
- Every prompt is English. `discussion_language` defaults to `en`, and task file headings stay English whatever the chat language.
- Marketplace points at the `rlatapy-luna/whackagent` fork.

### Fixed

- Commit author defaults to the repo's git identity instead of a hardcoded name.
- `wa-implementer` never prints credentials during runtime checks.

## [0.11.1] - 2026-09-21

### Fixed

- Task titles read as short labels, not narrative sentences, and summaries state the goal. The prioritization pass rewrites broken titles too.

## [0.11.0] - 2026-09-18

### Added

- Unified report card (`wa-code → Report card`), reused by `/wa-autopilot` and `/wa-feedback`.
- Voice rules (`wa-board → Voice`), referenced from every skill.

### Changed

- Tasks render as a two-line list (index, size, title, sprint tag, summary) instead of tables.

## [0.10.0] - 2026-09-15

### Added

- Sprints: an optional `sprint:` label grouping the tasks a big piece of work splits into. `/wa-board` filters by sprint; `/wa-autopilot` batches a sprint's todo tasks. Tasks of a sprint fork off `sprint/<sprint>`.
- `/wa-close`: commits, lands the branch (sprint merge, or `close.strategy`: `nothing`, `pr` or `merge`) and ends the task, always showing the git plan first.

### Changed

- `/wa-validate` no longer closes tasks or touches git.
- Skills, agents and templates are caveman-compressed.

## [0.9.0] - 2026-08-03

### Added

- `paths:` config block for backlog, tasks, wiki, reports and conventions, so a team can keep them in a folder it already shares.
- `/wa-validate`.
- `/wa-setup` on a configured project reconfigures: it diffs the config against the template, edits in place and moves files when a path changes.

### Changed

- One verifier sweeps four lenses (style, elegance, structure, correctness) and reports the lenses it covered.

## [0.8.0] - 2026-07-28

### Added

- `review.when`: `on_validation` (new default) runs the review once, over the cumulative diff, when the user validates; `each_round` keeps the previous behavior.
- `review.inline_micro_fixes`: `/wa-feedback` applies a micro-fix itself (≤2 files, ≤~20 lines, no new file or API change); anything bigger still goes to `wa-implementer`.

### Changed

- Pipeline collapsed to two subagents. `wa-reviewer` is deleted; `wa-verifier` becomes the read-only reviewer. `wa-implementer` drives the app it just built for the runtime check.
- `/wa-code` acts as a PM: plan, dispatch, never write code.
- `/wa-autopilot` runs independent tasks in parallel waves, one git worktree each.

### Removed

- `review.gate` and `review.conventions_model`.

## [0.7.0] - 2026-07-26

### Added

- `build.command` / `build.test_command`: the project's own build wrapper wins over the plugin default.
- `review.conventions_model` to run the checklist reviewer on a smaller model.

### Changed

- Review categories go from five to three: `conventions`, `structure`, `correctness`.
- Hard read budget for the implementer and reviewers, and line counts in the brief.
- Agents are resumed by the `agentId` returned at spawn.

## [0.6.0] - 2026-07-26

### Added

- `review.gate: auto` drops review lenses a round's diff cannot trigger.
- `branch.*` config block for per-task branches.

### Changed

- Rounds resume the same subagents with only the delta, and one implementer serves a whole task brick by brick.
- The understand phase emits a neighborhood brief handed to every subagent.

### Removed

- graphify exploration.

## [0.5.0] - 2026-07-25

### Changed

- Every grill question carries a recommended answer and a one-line reason.

## [0.4.0] - 2026-07-25

### Added

- `#` index on board rows, accepted by every skill that takes a task (`/wa-code 3`, `/wa-autopilot 2-5`).
- `/wa-feedback`: applies notes on a coded task through the same isolated pipeline as `/wa-code`.
- `/wa-setup` writes `.xcodebuildmcp/config.yaml` with incremental builds for Xcode projects.

### Changed

- `/wa-task` re-prioritizes the backlog after every new task; a bare `/wa-task` runs the pass alone.

### Removed

- `/wa-prio`: folded into `/wa-task`.

## [0.3.0] - 2026-07-08

### Added

- `wa-verifier` runtime check: installs the built app on a simulator, emulator or device through mobile-mcp, drives the UI against the acceptance criteria and captures screenshots.
- `verify` config block and acceptance criteria in the task template.

## [0.2.0] - 2026-07-01

### Changed

- Reworked README and skills; new Swift `architecture-global.md` module (YAGNI, SOLID, DRY, DI).

## [0.1.0] - 2026-07-01

### Added

- Initial release: `/wa-setup`, `/wa-task`, `/wa-prio`, `/wa-code`, `/wa-review`, `/wa-board`, `/wa-wiki`, `/wa-autopilot`, the `wa-implementer` and `wa-reviewer` subagents, Swift and TypeScript convention modules, and project templates.

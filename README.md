# whackagent

A Claude Code plugin for your entire development flow.

## Features

- **codebase knowledge**: project knowledge base — a wiki the skills read before searching the code.
- **task management**: create, prioritize, and track tasks.
- **code pipeline**: implement a task, review it, and prove it runs — the implementer exercises what it just built to confirm the task actually works. On by default where it matters most, unattended runs (`verify.mode`); attended, you test it yourself.
- **any stack**: iOS, Android, KMP, web, desktop, server, CLI, library. Build uses your project's own command when it has one (`build.command`), else the build tool it finds (XcodeBuildMCP, `./gradlew`, package scripts, cargo, go, dotnet, …). The runtime check picks its driver from `verify.platform`:

| Platform | Driver |
| --- | --- |
| iOS | XcodeBuildMCP (simulator), [mobile-mcp](https://github.com/mobile-next/mobile-mcp) (device) |
| Android | mobile-mcp (emulator or device) |
| Web | browser automation MCP (Playwright, Claude in Chrome) |
| Desktop | desktop / computer-use MCP when configured |
| Server | starts it, hits endpoints with `curl`, reads the logs |
| CLI | runs the binary, checks output and exit code |

## Installation

Add the marketplace, then install the plugin:

```bash
/plugin marketplace add rlatapy-luna/whackagent
/plugin install whackagent@whackagent
```

## Commands

| Command | Description |
| --- | --- |
| `/wa-setup` | Config + scaffolding (`.whackagent/`) |
| `/wa-board` | Dashboard: backlog list, suggests the next action |
| `/wa-board <sprint>` | Same, filtered to one sprint, with its progress |
| `/wa-task <desc\|task>` | Creates a task + spec, grills it (grill-me, includes architecture), then re-prioritizes the backlog |
| `/wa-task` | No argument: prioritization pass only — reorders, YAGNI, can split |
| `/wa-code <task>` | Full pipeline: understand → code + test → review → verify → report |
| `/wa-feedback [task] <notes>` | Applies your notes on what was built — micro-fix inline, bigger changes through the isolated pipeline |
| `/wa-validate [task]` | Your green light: "this is the feature I asked for" → runs the verifier on the whole diff. Doesn't close, doesn't touch git |
| `/wa-close [task]` | Ends the task: commit, land the branch (sprint merge, PR, or nothing — `close.strategy`), delete branch + worktree, `done` |
| `/wa-autopilot [tasks\|sprint]` | Applies wa-code on 1..n tasks autonomously, one branch per task, independent ones in parallel |
| `/wa-review [scope]` | Standalone review, 4 lenses (diff / path / project) — audit, optional `--fix` |
| `/wa-wiki` | Updates the wiki |
| `/wa-wiki <feature>` | Looks up info in the wiki, then the code |

Each step suggests the next one. You never have to figure out what to run.

### Referring to tasks

`/wa-board` numbers every row (`#` column), continuously across sections. Anywhere a task is expected you can pass that number instead of the slug — single, list, or range:

```
/wa-code 3
/wa-autopilot 2,4,5
/wa-autopilot 2-5
/wa-task 3
```

The number is display-only: it comes from the current backlog order, so it changes whenever the backlog is reordered (which happens on its own each time a task is added). The command always echoes what it resolved (`3 → sync-offline`) before doing any work, so a stale number can't silently run the wrong task.

### Sprints

A big piece of work rarely fits in one task. Refactoring the login screen is four or five of them, and you want to see them as one thing. That's a **sprint**: an optional label on a task.

```yaml
sprint: login-refacto
```

There is no sprint file and no command to create one. A sprint exists the moment a task names it, and stops existing when its last task closes. Most tasks never get one — it's there for the big ones.

Where it shows up:

- **`/wa-board`** grows a `Sprint` column (only when at least one task has a sprint) and prints progress per sprint: `🏁 login-refacto — 2/5 (1 in review, 2 todo)`. `/wa-board login-refacto` narrows the whole board to that sprint.
- **`/wa-task`** sets it: when you name one, or when the grill splits a `large` task — the children are born into the same sprint, which is the case sprints exist for. It never invents one silently; it proposes in one line.
- **Prioritization** keeps a sprint's tasks contiguous in the backlog. The sprint moves as a block, and you order tasks inside it (dependencies first). Pulling one out of the block is allowed, and it says why.
- **`/wa-autopilot login-refacto`** batches the sprint's `todo` tasks — leaving alone the ones already in review or validated, and echoing what it skipped.

- **`/wa-close`** merges the task branch into the sprint branch, and notices when the sprint's last task closes — then it offers to land the sprint branch itself.

Sprints deliberately aren't a status and aren't a backlog section: a sprint cuts across statuses (some tasks done, some in review, some untouched), and status sections are what tells you what to do next. There's no sprint status to set either — a sprint is complete when its tasks are. `/wa-code`, `/wa-feedback`, `/wa-validate` and `/wa-close` stay per task — one task at a time is how you review and merge.

## Typical flow

Bootstrap once, then loop: describe → code → you test → you validate → verifier → closed. Prioritization isn't a step you run — it happens on its own every time a task is added.

**0. Setup (once per project)**

```
/wa-setup
```

Detects language + project kind, scaffolds `.whackagent/`.

**1. Describe a task — `/wa-task`**

```
/wa-task Sign in with Apple on the login screen
```

Grills the idea (grill-me) until it's clear, plans the architecture, and writes `.whackagent/tasks/login-apple.md` with a spec + a size (🟢 quickwin / 🟡 medium / 🔴 large).

Then it prioritizes on its own — there's no separate command for it: a product-owner pass slots the new task where it belongs, applies YAGNI, and flags anything too big to split (asking first). You end up looking at a fresh, ordered board — top of the list is what to code next:

```
### Todo

1 · 🟢 **Login Apple**
    Sign in with Apple on login screen
2 · 🟡 **Offline cache** · `feed-offline`
    Cache the feed for offline reads
3 · 🔴 **Payments** ⚠
    Stripe checkout + receipts

🟢 quick win · 🟡 medium · 🔴 large · ⚠ not grilled
```

**2. Code it — `/wa-code <task>`**

```
/wa-code 1
```

A single command runs the whole coding cycle, orchestrating isolated subagents:

1. **Plan**: read the task, search the existing code to avoid rewriting, write a **BRIEF** (existing files + their sizes, what to reuse, layer boundaries, target layout) handed to every subagent so nobody re-explores the same ground, break it into bricks, plan the tests.
2. **Code**: one `wa-implementer` for the whole task, fed brick by brick (sequential) — it writes the feature *and* the tests and proves the build. Keeping the same agent across bricks means the conventions and the BRIEF are read once, and brick 2 already knows what brick 1 built.

   **Who tests it is a setting** (`verify.mode`). Default `autopilot`: unattended runs get driven by the agent — taps and screenshots, a browser, `curl` against the service, or a CLI run, acceptance criteria checked against what it sees, because nobody else is there — while an attended `/wa-code` stops at build + tests and **you** validate by using it. `always` drives it every time; `off` never. Whatever the mode, the implementer may still launch the app when it can't write the feature without seeing it run (reproduce a bug, judge a layout) — that's implementation, and it says so rather than passing it off as proof.
3. **Report**: same card every time — **Problem**, **Goal**, **Done**, **To test** (checklist of what the agent didn't prove + regression zones), then a build · tests · run · review status line. Saved in `.whackagent/reports/login-apple.md`, task moved to `review` — meaning *waiting for you to test it*. `/wa-autopilot` and `/wa-feedback` use the same card.

**3. Test it, iterate — `/wa-feedback`**, then **4. give the green light — `/wa-validate`**

The order matters, and it's the whole point of the flow: **code → you test → you validate → the verifier runs.** A review that happens before you've said "yes, that's the feature" reviews code three feedback rounds are about to move.

`/wa-validate <task>` is that green light. It says *"this matches my spec"* — nothing more. It does **not** close the task:

1. It dispatches one `wa-verifier`, which sweeps four lenses over the diff — **style**, **elegance**, **structure** (layers, boundaries, file tree) and **correctness** (real bugs, plus whether the diff meets the acceptance criteria) — and reports which ones ran. It's handed the diff hunks, so it judges the change instead of hunting for it, then autofix loops until clean. One agent rather than one per lens is a measured call: an isolated agent costs ~50k tokens of context before it reads a line, and every lens judges the same diff against the same rulebook — paying that twice bought nothing but duplicate findings to dedupe. And every round resumes the *same* agent rather than spawning a new one — it already holds its modules and the code, so round 2 costs a diff instead of a full re-read.

2. The scope is the **whole diff** — the code plus every feedback round, in one pass. Sending three notes costs three fixes, not three reviews.
3. Findings are severity-ordered, autofixed in a loop, and written to the task's `## Review`. The task moves to `validated`, **not** `done` — the autofix just changed code you'd tested, so you get to retest.
4. `/wa-validate` never touches git and never closes anything. Retest, then **`/wa-close`** — next section.

`review.when: each_round` restores a review after `/wa-code` and after every `/wa-feedback` if you'd rather catch drift early — `/wa-validate` still runs the final pass. **No task closes unreviewed either way: `/wa-close` refuses a task the verifier never saw.**

Iterating before that green light is `/wa-feedback`:

```
/wa-feedback the button should be secondary, and the error toast is too aggressive
```

Feedback is where quality usually leaks: the change looks small, so it gets patched inline — outside the conventions, outside the review, and nothing gets re-run. This command refuses to work that way, without making a one-liner cost an agent either. Each note is **routed by size**: a **micro-fix** (≤2 files, ≤~20 lines, no new file/type, no layer or public-API change) is applied straight away — convention module read first, build + tests re-run, hunks tagged so the verifier looks at them harder. Anything bigger goes back through `wa-implementer`, which re-reads every convention module before touching a line. Both paths get the runtime check when `verify.mode` puts it on the agent, and both end up in front of the verifier at `/wa-validate` — inline hunks flagged as written without a convention pass, so they get the harder look.

It also triages what you said: a **defect** gets fixed, an **adjustment** updates the acceptance criteria too, a **new feature** in disguise is sent back to `/wa-task` instead of being silently built — and a **rule** ("always do X") is offered up for your conventions file, so it stops being forgotten on the next task.

**5. Close it — `/wa-close <task>`**

```
/wa-close login-apple
```

Retested and still good? This ends the task and puts the branch where it belongs. It's a separate command from `/wa-validate` because it answers a different question — not *"is this code good"* but *"where does this work land"* — and half of what it does to git can't be undone.

So it always shows the plan first and waits for a yes:

```
Closing login-apple

commit    : 2 uncommitted files → commit (Benjamin Pisano)
sprint    : merge wa/login-apple → sprint/login-refacto
branch    : wa/login-apple deleted (merged)
worktree  : ../.wa-worktrees/login-apple removed
after     : 🏁 login-refacto — 3/5

ok? [y/n]
```

Where the work lands depends on one thing: whether the task is in a sprint.

- **In a sprint** → merged into the sprint branch. Always, no config involved.
- **Standalone** → `close.strategy` in your config, asked at `/wa-setup`:

```yaml
close:
  strategy: nothing   # nothing | pr | merge
  target: main        # where pr/merge lands
  delete_branch: auto # auto = only once the code lives elsewhere
```

`nothing` is the default and stops after the commit — the branch stays, you open the PR yourself. `pr` pushes and runs `gh pr create` onto `target`, and asks every single time, because a PR is visible to other people the moment it opens. `merge` merges locally without pushing.

A branch is only deleted once its code exists somewhere else: merged into its sprint branch, or merged into `target`. `pr` and `nothing` keep it — a PR needs its branch, and so do you. A leftover autopilot worktree gets removed with it, and if it's dirty the command stops and asks.

When the **last task of a sprint** closes, the sprint branch becomes the thing to deliver, so the same `close.strategy` is offered for it — proposed, never done silently:

```
🏁 login-refacto — 5/5, last task closed.
→ Recommended: PR sprint/login-refacto → main   (close.strategy: pr)
  Otherwise: keep the branch, you ship it yourself.
```

**6. Keep knowledge fresh — `/wa-wiki`**

```
/wa-wiki
```

Updates the wiki. `/wa-close` runs it on every close, so the wiki lands in the same commit/PR as the code it describes; run it yourself only for a catch-up sync.

> Prefer autonomy? `/wa-autopilot` runs the `/wa-code` cycle across the top backlog tasks on its own, one branch per task — and tasks whose files don't overlap run **at the same time**, each implementer in its own git worktree. It delivers **code**: built, run, committed on its branch, task left at `review`. The verifier doesn't run there — your review is asynchronous, so it waits for your `/wa-validate` on each branch, exactly like an attended run.

> **Branch per task.** Set `branch.per_task: true` (asked at `/wa-setup`) and `/wa-code` codes on `wa/<slug>` instead of your current branch. Combine it with `commit.auto_commit_after_validation` and `/wa-close` commits the task, then checks out the next task's branch for you — chain tasks without touching git.
>
> **Branch per sprint.** A task carrying a `sprint:` doesn't fork off `branch.base` — it forks off `sprint/<sprint>`, created from the base the first time a task of that sprint is coded (by `/wa-code` or by an `/wa-autopilot` wave). `/wa-close` merges each task back into it. That's the point: the third task of a login refacto starts from the first two instead of rediscovering them as a merge conflict. Nothing lands on a sprint branch before its task is reviewed and closed, so the base of the sprint stays code you approved. `branch.sprint_prefix: ""` turns it off.

## Shared backlog on GitHub

By default the backlog is files in your repo, for one agent at a time. Set `backlog.provider: github` (asked at `/wa-setup`) and it moves to a **GitHub Project**, so several agents in different worktrees, or on different machines, share one board without taking the same ticket.

Every ticket goes through six states. Agents only ever *take* a ticket; the rest is moved by what happens in the repo:

| State | Who moves it there |
| --- | --- |
| `todo` | an issue is opened (by `/wa-task`, or by hand on GitHub) |
| `grilling` | an agent claims it with `/wa-task #12`, a lock, so no other agent grills it |
| `grilled` | the hooks workflow, when branch `wa/12-<slug>` is pushed with its spec and non-empty acceptance criteria |
| `coding` | an agent claims it for one round (`/wa-code 12`, `/wa-autopilot`, `/wa-feedback`, `/wa-validate`, `/wa-close`), a lock held only while the agent works |
| `review` | the hooks workflow, when a round's push opens the draft PR or updates it. Draft = your turn to test; `/wa-close` marks it ready = your turn to merge |
| `done` | the hooks workflow, when the PR is merged. The issue is closed, and the sprint milestone too once empty. |

A closed-unmerged PR sends the ticket back to `grilled`.

- **Locks** are git refs (`refs/wa-claims/<issue>/<phase>`) created through the GitHub API. Creating a ref that already exists fails server-side, so when N agents claim the same ticket exactly one wins. The losers move on to the next ticket. The ref points at a commit naming the agent (`host:worktree`), so the board shows who holds what. Stale locks are flagged by `/wa-board` and cleared only by you (`/wa-task release 12`).
- **Where data lives:** the issue holds title and summary; the Project holds Status, priority (card order) and Size; the milestone is the sprint. The spec is the task file on the ticket branch, merged with the code. There is no local mirror.
- **Order is yours.** New tickets land at the bottom. Agents reorder only when you run `/wa-task` with no argument, and apply the new order on your yes.
- **Setup:** `/wa-setup backlog` creates or adopts the Project, adds the columns without touching existing ones, installs the hooks workflow through a PR, and walks you through the `WA_PROJECT_TOKEN` secret (a classic PAT with `project` + `repo`, needed because the Actions token can't write to Projects). It can migrate an existing local backlog.
- **Another tracker** (Jira, Linear, Trello, Notion) means a new folder under `providers/` implementing the same contract (`providers/CONTRACT.md`); the skills don't change.

## File tree created in your project

```
.whackagent/
  config.md            # language, coding language, project_kind, review timing + modules, paths, commit + branch + close policy
  conventions/         # copied convention modules (only the useful ones), editable per project
  BACKLOG.md           # task index (order = priority)
  tasks/<slug>.md      # one task = one file (frontmatter + body)
  wiki/index.md        # wiki summary
  wiki/<page>.md       # domain pages, [[wikilink]] links (Obsidian-compatible)
  reports/<slug>.md    # reports of delivered features
```

That's the default layout. Every one of those paths is configurable — `paths:` in `config.md`, asked at `/wa-setup`:

```yaml
paths:
  backlog: docs/BACKLOG.md
  tasks: docs/tasks
  wiki: docs/wiki          # committed and browsable on GitHub, for teammates who don't run whackagent
  reports: .whackagent/reports
  conventions: .whackagent/conventions
```

Relative resolves from the repo root, absolute works too (a wiki in a sibling repo). Only `.whackagent/config.md` is fixed — it's the file that carries the paths. Omit a key and it takes the default above, so a config written before `paths:` existed keeps working. Moving a path after setup means moving the files yourself; nothing back-fills. A shared wiki is also a good reason to set `compress_wiki: false` — caveman compression saves the agents tokens and costs your teammates readability.

## Task

```markdown
---
title: Login Apple          # short, explicit — the feature at a glance
summary: Sign in with Apple on the login screen   # one line, for the board
size: quickwin             # quickwin 🟢 | medium 🟡 | large 🔴
sprint: login-refacto       # optional — groups the tasks of one bigger piece of work
status: todo                # todo | in-progress | review | validated | done | canceled
                            # review = coded, waiting for your test · validated = spec approved,
                            # verifier passed, waiting for your retest
grilled: false             # true once it went through /wa-task (grill-me)
wiki: [[auth]], [[onboarding]]
note:                       # trigger / free context (optional)
---

## Context / Decisions
## Acceptance criteria
## Implementation
## Review
## Verification
## Feedback
```

## Conventions

Conventions are **modular**, one file per rule set, and **self-contained** (no dependency on another plugin). Two languages ship as multi-module packs with the same layout:

```
conventions/swift/                    conventions/kotlin/
  style.md                              style.md                 # file layout, naming, member order, doc/comments, format
  elegance.md                           elegance.md              # idiomatic code, not another language ported over; concurrency
  architecture-global.md                architecture-global.md   # YAGNI · SOLID · DRY, composition, DI, testability
  architecture-app.md                   architecture-app.md      # app tree: iOS (Coordinator → ViewModel → Store → View) / Android + KMP (UI → ViewModel → Repository)
  architecture-package.md               architecture-package.md  # library / CLI / server tree
  swiftui.md                            compose.md               # UI toolkit rules — copied ONLY if the project uses it
  testing.md                            testing.md               # Swift Testing / JUnit + coroutines-test, fakes
```

Single-file packs: `typescript.md` (front end and back end) and `generic.md` — the fallback for every other language (Rust, Go, Python, C#, Java, Dart, …). Generic is a starting point to grow with your team's rules, not a lesser mode: the pipeline, the runtime check and the review work the same whatever pack is loaded.

`/wa-setup` detects the language, the **kind** (`app` · `web` · `server` · `cli` · `package`) and the UI toolkit, then copies **only the useful modules** into `.whackagent/conventions/` (no `swiftui.md` in a package without SwiftUI, no `compose.md` in a Ktor server). You edit these copies to adapt per project (e.g. drop public doc). A polyglot repo (KMP shared code + iOS app) can load two packs.

The copied list lands in `review.modules` — the verifier reads exactly that, and nothing else in the tree.

## Skill dependencies

- **grill-me**: task clarification in `/wa-task`
- **caveman**: config and wiki compression at setup and on each `/wa-wiki` (`compress_wiki: true`, saves re-reading tokens)

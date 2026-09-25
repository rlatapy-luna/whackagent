---
name: wa-board
description: Renders a dashboard and suggests the next action based on the project's whackagent backlog.
---

# /wa-board

Dashboard. Lift lid on backlog, point next move.

## Do

0. **Read arg.** None → whole backlog. Sprint name (`/wa-board login-refacto`) → **filtered view**: only that sprint tasks, plus progress line. Resolve per **Sprints** below; unknown name → say so, list known sprints, stop.
1. Read `.whackagent/config.md` (respect discussion language). Missing → tell user run `/wa-setup`, stop.
2. Read `{backlog}` + referenced task files (need each task `summary`, `size`, `grilled`, `sprint`). **GitHub provider** → `wa-backlog list` (+ `--sprint` when filtered) and `wa-backlog claims` instead; see *GitHub board* below.
3. Render backlog as **list**, one section per status (see Display format below), priority order within each.
4. Suggest exactly **one** next action, by state (filtered run → scope suggestion to sprint):
   - something in `validated` → reviewed, wait user retest: `/wa-close <slug>` to finish (or `/wa-feedback` if retest found something). Highest precedence — one step from done.
   - something in `review` → coded, wait user test: `/wa-feedback <slug> <notes>` if notes, else `/wa-validate <slug>` to fire verifier. Beats starting new work.
   - something `in-progress` → resume it (`/wa-code <slug>`)
   - top `todo` not grilled → `/wa-task <slug>` to clarify (note: quick wins skip straight to `/wa-code`)
   - top `todo` grilled → `/wa-code <slug>`. Backlog order maintained by `/wa-task` prioritization pass — never suggest reprioritizing as step (if user *asks* to reorder, that `/wa-task` with no arg).
   - nothing in todo → `/wa-task <description>` to create one
   - batch of small grilled tasks → mention `/wa-autopilot` as option

## GitHub board

Same list format, sections by contract state, render order: **Coding → Review → Grilled → Grilling → Todo → Done**. Line 1 = `<#> · <size> **<title>** · #<n>`, plus sprint tag, plus `🔒 <agent>` when claimed (agent = worktree basename, short). `⚠` = `todo` (not grilled). Extra blocks under legend when present:

- `⏳ stale claims` — `claims` rows with `stale: true`: `#12 coding · <agent> · 2d, no push` → suggest `/wa-task release 12`.
- `📝 drafts` — Project draft items: not tickets, convert to issue on GitHub.

**Review section splits draft vs ready** — `gh pr list --json number,headRefName,isDraft`: draft → `🧪 draft #<pr>` (your test), ready → `🔀 ready #<pr>` (merge on GitHub).

Next action (GitHub): `review` + draft → `/wa-feedback <#> <notes>` or `/wa-validate <#>` (`/wa-close <#>` when task file says `phase: validated`) · unclaimed `grilled` on top → `/wa-code <#>` · else top `todo` → `/wa-task <#>` · `review` + ready → merge PR on GitHub (not agent job) · several unclaimed `grilled` → `/wa-autopilot`. Never suggest ticket someone else holds.

## Display format

Canonical way tasks shown anywhere in flow (here, `/wa-task` prioritization pass, `/wa-autopilot` recap). **List, never table.** One section per non-empty status, tasks priority order, two lines per task:

```
### In progress

1 · 🟡 **Export CSV**
    Export reports as CSV

### Todo

2 · 🟢 **Login Apple** · `login-refacto`
    Sign in with Apple on login screen
3 · 🟡 **Login layout** · `login-refacto`
    Login form redesign
4 · 🔴 **Sync offline** ⚠
    Offline queue + conflicts

🟢 quick win · 🟡 medium · 🔴 large · ⚠ not grilled
🏁 login-refacto — 0/2 (2 todo)
```

Rules:

- **Line 1** = `<#> · <size> **<title>**`, then `` · `<sprint>` `` when task has one, then ` ⚠` when `grilled: false`.
- **Line 2** = task `summary`, indented 4 spaces. Never dump task body.
- **#** = display index, written `2 ·` — never `2.`: markdown list syntax gets renumbered by renderer. Number **continuously across sections**, top to bottom in render order (In progress → Todo → Review → Validated → Done → Canceled). **Review** = coded, wait your test. **Validated** = you said it match spec, verifier passed, wait your retest to close. Never restart per section — index must be unique in render so user cite it without ambiguity.
- **Size** maps `size`: 🟢 `quickwin` · 🟡 `medium` · 🔴 `large`.
- **⚠** only on non-grilled tasks. Grilled = nothing — no ✅ on every line.
- **Sprint tag** only on tasks that have one. Filtered run (`/wa-board <sprint>`) drops it — every task is that sprint.
- Skip empty sections. Show only few recent under **Done**.
- Legend once below list; `⚠ not grilled` only when a ⚠ is on screen.
- At least one sprint in play → one **progress line per sprint** under legend, done+canceled excluded from numerator only:
  `🏁 login-refacto — 2/5 (1 in review, 2 todo)`. Filtered run → that single line, above list.

## Voice

Canonical, every whackagent skill. Applies to **screen output and `{reports}`**.

- **Telegraphic.** Fragments OK. No articles filler, no pleasantries, no hedging, no re-explaining the flow. One idea per line.
- **Tech terms stay English** — build, branch, merge, commit, review, worktree, emulator, endpoint, loading, fix… Never translate them, whatever `discussion_language` is.
- **Short common words.** `fix` not `apply a correction`, `test it` not `proceed to testing`.
- **Clarity beats brevity.** Fragment readable two ways → write the full sentence.
- **Task files are the exception** — `## Context / Decisions`, `## Acceptance criteria` in full simple sentences: verifier and user reread them months later, fragments there get misread.
- Screen headings and labels follow `discussion_language`. Task file section headings stay English always — skills look them up by name.

### Titles and summaries

Title = **label**, not sentence. Names the thing + what is done to it. ≤ 5 words. Must read like a dev wrote it in a ticket.

- **Never a narrative sentence.** Subject-verb-object that tells a story = failed title. `The dashboard asks the questions instead of the commands` → `Prompts in dashboard`.
- **Never a metaphor or image.** `Tests turn red at random` means nothing to anyone → `Fix flaky CLI tests`.
- **Tech terms stay tech terms**, here too — flaky, job, watermark, toggle, prompt, scope, seed, dashboard, child process. Paraphrasing or translating them produces gibberish.
- **No elegant rewording.** User says `rework UI` → write `Rework UI`, not `A shared style for the screens`.

Summary = **the goal, plainly**, ≤ 8 words. What it gives once done. Not the mechanism, not the story, not the list of what disappears.

| ❌ | ✅ title | ✅ summary |
|---|---|---|
| After a purge, jobs don't replay | `Replay jobs after purge` | purge doesn't reset watermarks |
| Import the whole country, or just a region | `Configurable import scope` | DATA_SCOPE: region locally, country in prod |
| CLI tests turn red at random | `Fix flaky CLI tests` | 4 TUI tests fail in suite, pass isolated |
| A shared style for the CLI screens | `Rework CLI screens UI` | shared design system in tui/design/ |
| The dashboard asks the questions instead of the commands | `Prompts in dashboard` | commands take options, dashboard asks |
| Dashboard navigation follows the command tree | `Dashboard nav by group` | one tab = one group, no more MENU_* |
| The Data screen reads the backend job list | `Data screen reads GET /admin/jobs` | no more job catalog duplicated in CLI |

## Backlog provider

Canonical, every skill. `backlog.provider` in config (missing → `local`) decides where tickets live. Contract: `${CLAUDE_PLUGIN_ROOT}/providers/CONTRACT.md` — skills speak its verbs and six states, never tracker terms.

- **`local`** — `{backlog}` + task file frontmatter, as every skill describes by default. Mapping: `providers/local.md`.
- **`github`** — `${CLAUDE_PLUGIN_ROOT}/providers/github/wa-backlog <verb>` for **every** backlog read or write, run from repo root. Details: `providers/github/README.md`. Then:
  - **No `{backlog}` file, no local mirror.** Board = the Project. Never write order, state, size, sprint, title into any file.
  - **Ticket id = issue number.** Display `#12`. Task file `{tasks}/<n>-<slug>.md` lives **on ticket branch** `<branch.prefix><n>-<slug>`, not on base — frontmatter `issue: <n>`, `phase:`, `wiki:`, `note:`, `created:`. No `title`/`summary`/`status`/`size`/`sprint`/`grilled` there.
  - **States = contract states** (`todo`, `grilling`, `grilled`, `coding`, `review`, `done`). Agent writes only through `claim` / `release`. `grilled`, `review`, `done` come from hooks — never set them, never "help" a lagging hook. Hook late → wait/re-read, or tell user.
  - **Claim before touching.** Grilling or coding a ticket = `claim` first. Exit 3 (taken) → name owner, never retry or steal; pick next or stop. Exit 4 (wrong state) → say state, stop.
  - **Coding sub-phase** (`in-progress` → `review` → `validated`) = task file `phase:` on ticket branch, where local writes `status:`. `phase: review` ≠ board `review`: first = coded, verifier not run; second = PR open, humans on turn.
  - **Agent round — `coding` is transient.** Board `coding` = an agent works *now*, never "waiting for user". Every round that touches ticket branch (`/wa-code`, `/wa-autopilot`, `/wa-feedback`, `/wa-validate`, `/wa-close`): `claim <n> coding` (from `grilled` or `review`) → work → commit (task file `phase:` + notes included) → **push**. First delivery opens **draft PR**; later rounds push to it. Hook sees `opened`/`synchronize`, sets `review`, drops claim. **Then check `gh pr view <pr> --json mergeable`** (retry while `UNKNOWN`): `CONFLICTING` = GitHub runs no `pull_request` workflow, push moved nothing, ticket stuck in `coding` → rebase ticket range onto PR base (`git rebase --onto origin/<base> $start^`), mechanical conflicts yourself (logic → stop and ask), rebuild + tests, `push --force-with-lease`, check again. Round ends with nothing to push → `release <n> coding --reset-to review` (PR open) or `--reset-to grilled` (no PR). Exit 3 on claim → someone mid-round: say who, stop.
  - **Draft PR** — `gh pr create --draft --assignee @me --base <fork point> --head <branch> --title "<ticket title>" --body` = summary + `Closes #<n>` + acceptance criteria checklist + line `Draft — verifier not run yet. Test, then /wa-feedback · /wa-validate · /wa-close.` Base = branch ticket forked from (sprint branch, else `close.target`). Then **`wa-backlog link-pr <n> <pr>`** — PR gets ticket milestone + manual closing link in **Development** (`Closes #<n>` links only on default-branch PRs; sprint and stacked PRs never are). Draft already open → push only. Draft = human tests; ready (`/wa-close` → `gh pr ready`) = human merges. Both `review`.
  - **Stacked PRs** — base = blocker's branch; repo must have `delete_branch_on_merge` (set by `provision`) so merging the bottom PR deletes its branch and GitHub retargets the next one to the sprint. Off → merges land in ticket branches, never the sprint.
  - **Screenshots** — PR whose diff changes UI (screen, component, theme, image resource) → **`wa-backlog screenshots <pr> <files>`** with implementer's `SCREENSHOTS:` (final state of code pushed, one per platform proved, light/dark when theme involved). Upload = `gh image` (extension `drogers0/gh-image`, GitHub user-attachments) — **never push images to any branch**; PR body gets `## Screenshots` table. Extension missing → say so, no screenshots, never a branch fallback. Later round with UI change → same verb, same names, section replaced. No UI in diff → none. No screenshot possible (device down) → say so in body, never old ones passed as current.
  - **Hooks version gate** — before first push, `git show origin/<base>:.github/workflows/whackagent-board.yml | head -1` → `template version: <v>`. `v ≥ 6` → rules above. `3 ≤ v < 6` → draft leaves ticket in `coding`, claim kept until `/wa-close` marks ready: same-host holder counts as yours (`claims[].agent` host = `whoami` host). `v < 3` / missing → **no draft** (opened PR = ready): push only. Either legacy case → say `hooks v<v> on <base> — /wa-setup backlog to upgrade`.
  - **Forced config:** `branch.per_task: true`, `close.strategy: pr`. Config says otherwise → provider wins, say so once.
  - **Sprint = milestone** — `set-field <n> sprint <name>`; progress from `list --sprint`.
  - `list` lags new tickets 1–3 min (GitHub indexing); `get`/`claim` always current.
  - **Squash merge assumed.** PRs land squashed: base never contains ticket's original commits, so `git merge-base` and plain rebase lie once any parent or stacked ticket landed. **Ticket range** = ticket's own commits, from its spec commit on: `start=$(git log --format=%H --grep="^task: grill #<n> " <branch> | tail -1)`, range `$start^..<branch>`. Diff = `git diff $start^ <branch>`; rebase = `git rebase --onto <base> $start^`. Works squash or not — use it always, never `<base>..HEAD` / `<base>...HEAD`.

## Paths

Every whackagent skill writes `{backlog}` `{tasks}` `{wiki}` `{reports}` `{conventions}` instead of literal folder. They resolve from `paths:` in `.whackagent/config.md`, read at step 1 — project may keep wiki in `docs/wiki/` so team that doesn't run whackagent still read it.

- **Key missing → the default** (`.whackagent/BACKLOG.md`, `.whackagent/tasks`, `.whackagent/wiki`, `.whackagent/reports`, `.whackagent/conventions`). Config written before `paths:` existed keep working untouched.
- **Relative resolves from repo root**, not cwd. Absolute paths allowed.
- **`.whackagent/config.md` is the one fixed path** — it carry the others.
- Path points at nothing → say which key and what it points at, suggest `/wa-setup`. Never fall back to `.whackagent/` behind user back, never create folder somewhere else: wiki silently written to default is wiki team never sees.

## Sprints

Sprint = **optional kebab-case label** on task (`sprint: login-refacto`), grouping big work split across several tasks. Canonical rules, every skill refers here.

- **No sprint file, no create command.** Sprint exists moment task names it, stops existing when its last task closes. Nothing to declare, nothing to clean up.
- **Truth is task file `sprint:` field.** `{backlog}` echoes it as `· <sprint>` after link; two disagree → task file wins, fix backlog line.
- **Not a status section.** Sprint cuts across statuses — sprint has tasks in todo, review and done at once. Sections stay per status, always.
- **Contiguity.** Tasks of one sprint stay adjacent inside each status section, in sprint own internal order. `/wa-task` prioritization pass maintains that — sprint moves as block.
- **Resolving a name**: match `sprint:` values across all task files, exact first, then unique case-insensitive / kebab-normalized match. No match → say so and list known sprints (sprint with no live task is closed, not typo). Ambiguous → list candidates, stop.
- **Slug vs sprint**: task slug wins over sprint of same name. Name clash → say which one you took.

- **One branch, when `branch.per_task`.** `<branch.sprint_prefix><sprint>` (default `sprint/login-refacto`), created from `branch.base` by whoever needs it first — `/wa-code` step 0 or `/wa-autopilot` wave. Tasks of sprint fork off it and `/wa-close` merges them back, so each task starts from sprint current state. `branch.sprint_prefix: ""` turns that off: tasks use `branch.base` like any other. Nothing merges into sprint branch before its task reviewed and closed.
- **A sprint is complete, never `done`.** No sprint status exists. Complete when no task of it left in `todo`/`in-progress`/`review`/`validated` — `/wa-close` notices and offers to land sprint branch.

Commands taking sprint name: `/wa-board <sprint>` (filtered view), `/wa-autopilot <sprint>` (batch its todo tasks), `/wa-task` (assigns and inherits). `/wa-code`, `/wa-validate`, `/wa-feedback`, `/wa-close` stay **per task** — one task is their unit, and whole sprint unattended is what `/wa-autopilot` already does better.

## Task indexes

Index is **display-only**, derived from current backlog order. Never written into `{backlog}` or task files — order alone carry priority, so index shifts when order shifts.

Any skill taking task can take indexes instead of slugs: `/wa-code 3`, `/wa-autopilot 2,4,5`, `/wa-autopilot 2-5`, `/wa-task 3`. Resolve by re-reading `{backlog}` and re-deriving same numbering (rules above), then:

- Echo resolved mapping (`2 → login-apple`, `3 → sync-offline`) before work, so user catch stale index.
- Index out of range or pointing at section that make no sense for command → say so, stop, don't guess neighbour.
- Ambiguous input (slug that look like number) → treat as slug if task file match, else index.

## Output

List, then one bold **→ next:** line. No re-explain whole flow each time. Wording per **Voice**.
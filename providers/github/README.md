# GitHub provider

`backlog.provider: github`. Backlog = GitHub Project (v2) + repo issues. Many agents, many worktrees, one board — claims atomic, state moved by repo events. Implements **providers/CONTRACT.md**.

## Pieces

| Piece | Where | Role |
|---|---|---|
| `wa-backlog` | `${CLAUDE_PLUGIN_ROOT}/providers/github/wa-backlog` | every contract verb. Python 3 stdlib + `gh`. Run from repo root. |
| board workflow | `whackagent-board.yml` → target repo `.github/workflows/` | hooks: issue opened, spec pushed, PR opened/pushed/merged/closed |
| repo variables | `WA_PROJECT_OWNER`, `WA_PROJECT_NUMBER`, `WA_STATUS_FIELD`, `WA_SIZE_FIELD`, `WA_STATES`, `WA_TASKS_PATH`, `WA_BRANCH_PREFIX`, `WA_STALE_AFTER_HOURS` | single source for script + workflow. Written by `wa-backlog provision`. |
| secret | `WA_PROJECT_TOKEN` | classic PAT, scopes `project` + `repo`. Workflow Projects writes only — `GITHUB_TOKEN` can't reach Projects v2. |
| claims | refs `refs/wa-claims/<issue#>/<phase>` | lock. Ref points at empty commit whose message names agent. |

Local cache: `<git-common-dir>/whackagent/github-cache.json` (ids, shared by all worktrees of clone). Rebuilt automatically when repo variables change (fingerprint checked each run) or when board holds an option id cache doesn't know. `wa-backlog config --refresh` forces it.

## Mapping

| Contract | GitHub |
|---|---|
| ticket id | issue number |
| ticket branch | `wa/<n>-<slug>`, created by `gh issue develop` → linked in issue **Development**. Only branches GitHub creates can be linked — never `git checkout -b` + push |
| title / summary | issue title / first non-empty body line |
| state | Project `Status` single-select, options named per `WA_STATES` |
| priority | Project item position (top = next) |
| size | Project `Size` single-select: `quickwin`, `medium`, `large` |
| sprint | milestone — created on first use, closed by hook when last issue done |
| excluded | label `wa-ignore` |
| dependencies | issue **Relationships** (blocked by) — `depend`, read back in `get` → `blocked_by` |

Every issue = ticket (opt-out `wa-ignore`). Project draft items = not tickets: no number, no branch, no `Closes #`. `/wa-board` lists them to convert.

## Hooks — who moves what

| Event | Condition | Result |
|---|---|---|
| `issues: opened` | no `wa-ignore` | add to Project, `todo` |
| `push` to `wa/**` | branch `wa/<n>-…`, `{tasks}/<n>-*.md` with `issue: <n>` + non-empty `## Acceptance criteria`, state `todo`/`grilling` | `grilled`, grilling claim deleted |
| `pull_request: opened/reopened/ready_for_review` | head `wa/<n>-…`, same repo, not draft, not `done` | `ready-to-merge`, coding claim deleted |
| `pull_request: opened/synchronize`, **draft** | head `wa/<n>-…` | nothing moves, claim kept — draft = review surface while still coding (`/wa-autopilot` delivery) |
| `pull_request: converted_to_draft` | state `ready-to-merge` | `grilled` — claim was released at ready, so ticket must be re-claimed (`/wa-code <n>`) |
| `pull_request: synchronize` | coding claim exists | `ready-to-merge`, claim deleted (fix round over) |
| `pull_request: closed`, merged | any base | `done`, issue closed, claims deleted, milestone closed when empty |
| `pull_request: closed`, unmerged | not `done` | `grilled`, coding claim deleted |

Workflow runs from default branch for `issues`, from pushed ref for `push`/`pull_request` — so it must be merged on default branch **and** present on ticket branches (branches forked after merge carry it).

Custom `branch.prefix` → edit `branches:` filter in workflow to match.

## Setup (`/wa-setup`, provider step)

1. `gh auth status` shows scope `project`. Missing → user runs `! gh auth refresh -h github.com -s project` (browser device flow — can't be done for them).
2. `wa-backlog provision --title "<name>"` (new) or `--project <n>` (adopt). Existing Project: never rewrites columns — adds missing state options keeping existing ids, or maps states onto existing names with `--state grilled="Ready for dev"`. Creates `Size` if missing. Links repo. Writes variables.
3. Workflow: copy to `.github/workflows/whackagent-board.yml` on branch `wa-setup/board-hooks`, open PR — never push default branch directly. Hooks live once merged.
4. Secret: user creates PAT — `https://github.com/settings/tokens/new?scopes=project,repo&description=whackagent-board` — then `! pbpaste | gh secret set WA_PROJECT_TOKEN -R <repo>` (clipboard, token never in chat). `provision` output `secret_WA_PROJECT_TOKEN` confirms.
5. Offer (ask): import open issues as `todo` — `wa-backlog get <n>` per issue adds it. Offer (ask): smoke test — `create` → `claim grilling` → `release --reset-to todo` → close issue.

## Known behavior

- **Project item list lags** writes by 1–3 min (GitHub indexing). `list` may miss brand-new tickets; `get`/`claim` read through issue — always current.
- Claim race: N agents claim same ticket → exactly one exit 0, rest exit 3 with owner (tested 6-way). Only `Reference already exists` counts as taken; any other ref error surfaces as-is.
- Columns outside the six states (board's own `Blocked`, default `In Progress`) are kept by provision with their colors/descriptions, and left alone by script and hooks: `state: null`, `column: <name>`, not claimable.
- Closed issues (canceled, split parent) hidden from `list`, never claimable.
- Right after someone moves a card by hand, a read may see previous column for a second or two (GitHub replica lag).
- Organization project: works with same PAT scopes; GitHub App path (not tied to one person) not built yet.

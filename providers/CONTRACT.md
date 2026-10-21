# Backlog provider contract

Where tickets live and how their state moves. **Implementer view**, for whoever builds a provider. Worker-facing rules of a shared board (GitHub, Plane) — what any agent or tool must do, whatever its loop — live in `templates/BOARD.md`, installed in each project as `BOARD.md`: shared rules, identical for every tool, plus one `This board: <tool>` section kept by setup (`<!-- board-tool: <tool> -->` blocks). They win on conflict. Contract version: `board-contract: 2.4`, stamped in every board file (BOARD.md, pointer block, PR template sections, hooks callers) and = script `CONTRACT_VERSION`; script warns when project's BOARD.md differs. Skills speak **only** verbs below — never tracker terms (issue, card, column, GraphQL). New tracker (Jira, Linear, Trello, Notion) = new folder under `providers/` implementing same verbs, same states, same exit codes.

Config picks provider: `backlog.provider: local | github | plane` in `.whackagent/config.md`. Missing → `local`. Code host of non-local board: `vcs.provider` (only `github`, missing → `github`).

| Provider | Implementation | Multi-agent |
|---|---|---|
| `local` | prompt-implemented, files — `providers/local.md` | no — one agent, one checkout |
| `github` | script `providers/wa-backlog` (`GitHubBoard`; `providers/github/wa-backlog` links to it) + board workflow — `providers/github/README.md` | yes — atomic claims, hooks drive state |
| `plane` | **experimental** — same script (`PlaneBoard`), Plane CE board, code on GitHub — `providers/plane/README.md` | claims yes (atomic, same refs); priority, dependencies, comments, cancel, sprints (parent + cycle), milestones (modules) yes; hooks (`wa-backlog hook`, self-hosted runner): spec push → `grilled`, PR opened / round pushed → `review`, merged → `done`, closed unmerged → `grilled`, sprint root closed on landing yes; PR = card link (ticket from branch, else card link in PR body) yes; report-only board check (schedule, one card comment per problem) yes; `BOARD.md` Plane section yes; single-writer guard (`check-integration`: Plane's own GitHub integration off) yes; move from GitHub board (`migrate`, dry run first, resumable) yes; spec in card description → `grilled` no, by design (task file only); size no |

## States

Shared lifecycle, provider-neutral names. Provider maps them onto its own columns.

| State | Meaning | Entered by |
|---|---|---|
| `todo` | ticket exists, not grilled | creation (agent or human on tracker UI) |
| `grilling` | **locked** — one agent grilling it (first grill, or re-grill) | agent `claim <id> grilling` |
| `grilled` | spec written, ready to code | **data**: acceptance criteria in issue body (edit by a writer; GitHub only — Plane card description never counts), or ticket branch holds spec file (hook) |
| `coding` | **locked, transient** — one agent working a round (code, feedback, validate, close) | agent `claim <id> coding` |
| `review` | change proposed (PR open, draft or not) — humans on turn: test (draft) or merge (ready) | **data**: PR opened, or agent round pushed to it (hook) |
| `done` | change landed | **data**: PR merged (hook) |

Agents only ever write `grilling` / `coding` (through `claim`) and resets through `release`. Every other transition comes from repo events — agent never sets `grilled`, `review`, `done` itself. Code drives board, not agent's word.

`coding` never waits on human. Agent round = claim → work → commit → push; push opens draft PR or updates it, hook moves ticket to `review` and drops claim. Round aborted without push → `release <id> coding --reset-to review` when PR open, else `--reset-to grilled`.

Whackagent sub-phase (`in-progress` → `review` → `validated`) lives in task file frontmatter `phase:` (local: `status:`), pushed with each round — coding lock guarantee single writer per round, board stay coarse. Same word, two levels: board `review` = humans on turn; `phase: review` = coded, verifier not run yet; `phase: validated` = verifier passed.

### Who's on turn

| Board | Sub-phase | PR (GitHub) | Human does | Next |
|---|---|---|---|---|
| `coding` | `in-progress` | — | nothing: agent works | wait |
| `review` | `review` | draft | test | `/wa-feedback` (notes) or `/wa-validate` → clean: PR ready |
| `review` | `validated` | ready | test, merge | GitHub UI, or `/wa-close` (merges on yes) → hook → `done` |

Two GitHub paths to ready PR, same end: clean `/wa-validate` (attended) or clean `/wa-autopilot` delivery — wiki synced, rebased. Findings open → PR stays draft. Local: `/wa-close` lands per `close.strategy`, sets `done`.

## Verbs

All print JSON on stdout, messages on stderr.

| Verb | Does | Output / exit |
|---|---|---|
| `list [--state s,…] [--sprint x] [--milestone m] [--all] [--owners]` | board rows, **priority order**; `done` and closed tickets hidden unless `--all` | `[{number,title,summary,state,column,size,sprint,milestone,closed,not_planned,assignees,reserved,claims,url}]` (`not_planned`: closed as not planned = canceled), `review` rows add `phase` (sub-phase, *Who's on turn*; null unknown); draft rows `{draft:true,title}` only when unfiltered |
| `get <id>` | one ticket + its branch + its sub-phase + its blockers | object, `branch` null before grilling pushed, `phase` null without task file, `blocked_by: [{number,state}]` |
| `create --title --summary [--size] [--sprint] [--milestone m] [--note]` | new ticket in `todo`, bottom of board; milestone per *Milestones* below | `{number,url,state,milestone}` |
| `claim <id> grilling\|coding [--agent a] [--blocked-ok]` | **atomic lock**, then state → phase, assign current account (trackers with assignees), trail comment | exit 0 won · **3 taken** (prints owner) · **4 wrong state**, or `coding` from `grilled` with open blocker (*Claim rules*) |
| `release <id> <phase> [--reset-to s] [--reason r]` | drop lock, undo assignment that claim made, optional state reset, trail comment | object |
| `set-state <id> <state>` | raw state write — setup/migration/manual repair only | object |
| `move <id> --top\|--bottom\|--before n\|--after n` | reprioritize — one order over whole board, the one `list` prints | object |
| `cancel <id> [--reason r]` | closed as not planned (`not_planned: true`): off board, never claimable, never `done`; trail comment. **On human's word only.** Already canceled → `already: true`. Landed or claimed → exit 4 | `{number,canceled}` |
| `set-field <id> size <quickwin\|medium\|large>` / `set-field <id> sprint <name\|"">` / `set-field <id> milestone <title\|"">` | fields; sprint created on first use, milestone must be known to `milestones` (never created) | object |
| `milestones` | release scopes, **highest first** (*Milestones*) — open ones, then closed ones still holding open tickets | `[{title,open,tickets,done}]` — `tickets` total, `done` closed (landed or canceled) |
| `close-milestone <title>` | close shipped milestone — **`/wa-release` only, on user's yes** | `{title,open:false}`; unknown → exit 2 |
| `split <id>` | ticket too big → becomes **root of sprint** named after its title (kebab-case), leaves board; children join via `create --sprint <name>`. Unclaimed, open, not in sprint, name free — else exit 4 (title with no letter or digit: exit 2) | `{number,sprint}` |
| `comment <id> <text>` | human-facing trail | object |
| `depend <id> --on <id>[,<id>…]` | ticket blocked by others — dependency graph visible on tracker. Idempotent. Add-only: no verb removes one (human does, on tracker) | object |
| `claims` | every live lock: owner, since, branch, last activity, `stale` | array |
| `branch <id>` | remote branch carrying ticket | `{branch}` |
| `whoami [--agent a]` | agent id used for claims (`WA_AGENT` env, else `<host>:<worktree>`), plus tracker account | `{agent,login}` — `login` null when tracker has no accounts; board whose accounts aren't the code host's (Plane) adds `vcs_login` (account writing claim refs, branches, PRs) |
| `check-integration [--plane-url u --workspace w]` | Plane only, setup guard: is Plane's own GitHub integration off (single writer)? Flags default to `WA_PLANE_URL` / `WA_PLANE_WORKSPACE`. GitHub board: exit 2 | `{github_integration: off\|on\|unknown, edition, probe: {route,status}, installed, reason, fix?}` — `off`: none listed, or Community Edition (no integration route); `on`: listed for workspace; `unknown`: list unreadable with API key, or absent on other edition (human checks in Plane); `fix` unless `off` |
| `migrate [--apply [--push]] [--plane-url u --workspace w --project p]` | GitHub board → Plane, **`/wa-setup` reconfigure only**, after `provision --plane-url …` (target = `WA_PLANE_*` variables; flags only checked against them). Dry run unless `--apply`: changes nothing, prints plan. Refuses while any ticket in `grilling` / `coding` / `review` or a column outside the six states, any claim held, or open PR on a ticket. `--apply`: per ticket, board order — card in `todo` / `grilled` (title, body, comments under original author + date header, order, sprint, milestone; modules created from GitHub milestones), ticket branch squashed into one local commit `task: grill <key> <slug>` on new branch `<prefix><key>-<slug>` (task file renamed, `issue: <key>`), issue closed as not planned + link comment + label `wa-moved`; then dependencies, sprint parent issues closed. `--push` pushes new branches, deletes old ones. Size, assignees, done/canceled tickets never copied; GitHub Project untouched. Rerun resumes: every step keyed on what it left (card/comment external id, branch ref, marker + label + closed) | plan `{mode,source,target,refused,tickets,modules,sprints,dependencies,not_copied,archive,setup_pr,summary}` (+ `result`, `failed`); refused → **exit 4**, tickets named. Plane → GitHub, local → Plane: not built |
| `hook [--event e --payload f]` | board hooks of a non-GitHub board — **hooks workflow only** (or local replay): one GitHub event (`GITHUB_EVENT_NAME`/`GITHUB_EVENT_PATH`) → data-driven state writes; agents never run it. GitHub board: its hooks live in `board.yml`, exit 2 | `{event,ticket,action,reason}` (board check `schedule` / `workflow_dispatch`: + `violations` `[{ticket,kind,problem,comment}]`, `resolved`); event without rule → no-op, exit 0 |

Exit codes: 0 ok · 1 error · 2 usage · 3 claim taken · 4 wrong state. Treat 3 and 4 as normal outcomes, not failures: pick next ticket or tell user.

## Claim rules

- `grilling` claimable from `todo`, or from `grilled` (re-grill: spec rewritten on same branch, push hook moves it back). `coding` claimable from `grilled` or `review` (fix round on open PR). Both claimed on one `grilled` ticket at once → never both win. Closed ticket, or ticket in column outside the six states (`state: null`, `column: "Blocked"`) → exit 4, never touched.
- **Open blocker → no first coding round.** `claim <id> coding` from `grilled` with any blocker open (`get` → `blocked_by`, `state: open`; done or canceled blocker blocks nothing) → exit 4, blockers named. `--blocked-ok` claims anyway — only on purpose: stacked on blocker, or unrelated blocker user approved (**BOARD.md → Dependencies**). `coding` from `review` (PR open: fix round, stack cascade) and `grilling` never checked.
- **Assigned to another account → reserved.** Tracker with assignees: ticket assigned to someone other than current account → exit 3, owner = assignee(s), `assigned: true`. Unassigned or assigned to current account → normal rules. `list` / `get` rows carry `assignees` + `reserved`. Tracker without assignees (local) → never reserved.
- **Winning claim assigns current account** when not already assignee — ticket then reserved against other accounts for rest of its life (hooks never unassign). `release` removes that assignment only when its claim made it; assignment a human made stays.
- Lost claim (exit 3) → never retry same ticket, never steal. Next ticket, or report owner to user.
- Lock released by data (hook) on next transition, or by `release` on explicit abort / stale cleanup — **human-triggered only**. No expiry: grilling interactive, human may answer in two days.
- `claims` flags `stale` past `stale_after` with no push on ticket branch. `/wa-board` shows them; `/wa-task release <id>` clears.

## Milestones

Release scope (iteration, version) — **not** a sprint. Sprint = feature grouping with its own branch (**reference/sprints.md**); milestone = what ships together. Ticket carries both, either, or none. Skill-side rules: **reference/milestones.md**.

- **Humans own the list.** They open milestones on the tracker (local: config). No verb creates one; `set-field` / `create --milestone` with unknown title → exit 2. Closing = human on tracker, or `close-milestone` from `/wa-release` on user's yes.
- **`create` defaults to highest open milestone**, so new work lands in the scope being planned, never in current or past one. `--milestone m` = that one; `--milestone ""` = none. No open milestone → none. **Track milestones** (keys of `branch.tracks`, **reference/tracks.md**) never picked as default — provider knows them from its settings (GitHub: `WA_TRACKS`; local: config); only `--milestone <track>` puts ticket there.
- **Highest** = title in version order, digit runs compared as numbers (`0.10.0` > `0.9.0` > `0.3.0` > `0.2.1`); same rank → creation order (GitHub milestone number, local position in `backlog.milestones`). Why title, not creation: patch milestone opened late (`0.2.1` after `0.3.0`) is current scope, not where new work lands.
- Tracker without milestones → `milestones` returns `[]`, `milestone` null, flag accepted and ignored.

## Ticket ↔ repo contract

- Ticket id `<id>` (`number` in every output) = opaque: GitHub issue number (`12`, shown `#12`), or board key `<PROJECT>-<n>` (string `"WA-42"`, shown as is). Same id in verb args, branch, task file, claim ref `refs/wa-claims/<id>/<phase>`.
- Branch `<branch.prefix><id>-<slug>` (`wa/12-login-apple`). Grilling creates it (spec in issue body: first coding round does), coding continues on it, PR opens from it.
- Spec = `## Acceptance criteria` in issue body, or file `{tasks}/<id>-<slug>.md` on that branch (frontmatter `issue: <id>`, non-empty `## Acceptance criteria`). First coding round on body spec builds that file from issue body. File = everything needed to start coding.
- Ticket title/summary/state/size/sprint/milestone live in tracker only — never duplicated in task file. Optional `ported-from:` / `lands:` (tracks) are task-file facts, not tracker fields.

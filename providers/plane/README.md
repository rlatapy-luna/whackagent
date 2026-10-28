# Plane provider

`backlog.provider: plane`, with GitHub as the code host (`vcs.provider: github`). The board is a self-hosted **Plane Community Edition** project; branches, pull requests and claims stay on GitHub. **Experimental.** The adapter is `PlaneBoard` in `providers/wa-backlog`, next to `GitHubBoard`, behind the same verbs. Skill-side rules: **reference/board-plane.md**. The local test rig is described in **scripts/plane-rig/README.md**.

## Built so far

`provision`, `config`, `list`, `get` (with `blocked_by`, read from Plane relations), `create`, the claim verbs (`claim`, `release` with `--reset-to`, `claims`, `whoami`), `set-state`, `comment`, `move`, `depend`, `cancel`, sprints (`split`, `create --sprint`, `set-field sprint`, `list --sprint`) and milestones (`milestones`, `close-milestone`, `create --milestone`, `set-field milestone`, `list --milestone`). `link-pr` (repair: adds the PR as a link on the card). `set-field size` exits 2 for good: Plane CE cannot create estimates over its API (see below), so a Plane board has no size, and `create --size` drops the size with a note. Hooks: `hook` moves a card to Grilled when its spec is pushed, and to Review, Done or back to Grilled on pull request events, linking the PR on the card, and a scheduled board check reports contract breaks on the cards without moving any (see *Hooks*). `check-integration` is the setup guard for the single-writer rule, and `BOARD.md` has a Plane section (see *Board contract*). `migrate` moves an existing GitHub-board project to the Plane project, dry run first (see *Migration*).

### Claims

Claims are the shared core's, unchanged: a git ref `refs/wa-claims/WA-42/<phase>` created over the GitHub REST API, where "Reference already exists" means taken (exit 3), with the claim-from rules and exit codes of `providers/CONTRACT.md`. Only the board writes go to Plane:

- **State.** `PATCH work-items/<id>/ {"state", "sort_order"}`. The card keeps its priority: `sort_order` is sent unchanged with the state, the same as a GitHub Project, where a Status change keeps the item's place in its one order, so `list` order does not move. Plane 1.4.2 keeps `sort_order` on a state change anyway; sending it guards against a release that repositions. A claim whose state write fails deletes its ref again.
- **Assignee.** The winning claim assigns the Plane user owning the API key (`GET users/me/`). Plane replaces the assignee list whole on `PATCH`, so the adapter reads the list fresh and writes it back with the user added; `release` removes only an assignment its claim recorded (trailer `assigned: <display name>`, which maps back to the key user's own id first). `reserved` compares that user's **id** with the card's assignee ids: Plane display names are not unique, and two users named alike must not see each other's cards as their own. Rows still show assignees by display name (workspace members, read once per run). Every claim commit also carries `account: <user id>`, the claimer's own id, so the review hook can assign the round's developer (see *Hooks*).
- **Trail comment.** `POST work-items/<id>/comments/ {"comment_html"}` (see *Comments*).
- **Accounts.** `whoami` prints `login` (the Plane display name that claims assign and `reserved` compares) and `vcs_login` (the GitHub login that writes the claim refs, branches and PRs). The claim owner shown by `claims` and exit 3 is the agent id, as on GitHub.

A first coding round (`claim coding` from Grilled) on a card with an open blocker exits 4, as on GitHub (`providers/CONTRACT.md` → *Claim rules*): the core reads `blocked_by` (one relations call, one call per blocker), and a blocker counts open until its card sits in a completed or cancelled group state.

Checked live on the rig and `whackagent-playground-plane`: six parallel `claim grilling` from Todo, then six `claim coding` from Grilled, each gave one exit 0 and five exit 3, the card in the winner's state with the key user assigned. Grilling and coding claimed at once on a Grilled card never both win. `release --reset-to grilled|review` moved the card back and deleted the ref, and a claim from a wrong state or on a canceled card exits 4.

### Priority

`sort_order` is one order over the whole board, the order `list` prints (`?order_by=sort_order`, sorted again client-side so ties keep the server's order). Each Plane column shows its slice of it, so a drag inside a column and `list` always agree. `move` writes one value, the one the web UI would write for that drop: `--top` the board's first value minus 65535, `--bottom` the last plus 65535, `--before n` / `--after n` the midpoint between the two neighbours. A state change keeps the value (see *Claims*). A gap under `1e-6` (about 50 midpoints in the same place) cannot take another midpoint: `move` then widens a window around the slot until its cards fit at least 1.0 apart between the window's two outer cards, rewrites only those cards, and inserts. The board is never renumbered as a whole.

### Dependencies and cancel

- `depend <n> --on <x>`: `POST work-items/<n>/relations/ {"relation_type": "blocked_by", "issues": [...]}`, after a `GET` of the same route to tell added from already there. Plane shows the relation on both cards. The API has no route to remove one, so a dependency added by mistake is removed in the Plane UI. A ticket cannot block itself (exit 2), and a blocker must be a card of this board.
- `cancel <n>`: the card moves to the Canceled state (`WA_PLANE_STATES.canceled`, cancelled group), its `sort_order` kept, plus a `🚫 canceled — <reason>` comment. `list` hides it, `list --all` shows it with `state: null`, `closed` and `not_planned`, and claims on it exit 4. A card in Done (landed) or holding a claim exits 4.

### Sprints and milestones

Neither needs a paid Plane feature: a sprint is a parent work item plus a cycle, a milestone is a module (Plane's paid Milestones are not used). `provision` switches the project's cycles and modules on (`PATCH <P>/ {"cycle_view": true, "module_view": true}`, only when one is off) and reports what it switched in `features_enabled`.

- **Sprint truth = the parent.** A sprint is the work item labeled `wa-sprint` whose name in kebab-case is the sprint name (`sprint_name`, the same rule as GitHub); its tickets are its children (`parent`). A row's `sprint` is read from its parent, which `list` already holds (every card comes back in the one work-item list), so it costs no call; `get` reads the parent once. The root is not a ticket: `list` skips it, `get` and `claim` exit 4. Plane has no "off the board", so the root keeps its column.
- **The cycle mirrors it**, so the split shows in Plane's cycle view. Cycle name = sprint name; it is created without dates (Plane takes both dates or none, and a dateless cycle never ends, so it always takes cards). A card is in one cycle at most, so adding it to the next sprint's cycle moves it out of the previous one. A card dropped in a cycle by hand without the parent is not in the sprint.
- `split <id>`: refuses when another root has the same name (exit 4), adds the label (Plane replaces the label list whole, so the list is sent back with it), creates the cycle, comments `🌳 split`. Output `{number, sprint}`, as GitHub. Children come from `create --sprint <name> --milestone <parent's>`.
- `set-field <id> sprint <name>`: root created on first use (labeled, in Todo; a root in Done or Canceled goes back to Todo, like GitHub reopening the parent issue), `PATCH {"parent": <root>}`, `POST <P>/cycles/<c>/cycle-issues/`. `""` sets `parent: null` and `DELETE`s the card from the old cycle. A card under a parent that is not a sprint root exits 4 (never replace a human's hierarchy).
- **Milestone = module.** Humans create modules in Plane. `milestones` returns the GitHub shape and order: `[{title, open, tickets, done}]`, open modules highest first (`milestone_rank`: version order of names, then creation time), then closed ones still holding open cards. `tickets` = the module's `total_issues`, `done` = `completed_issues + cancelled_issues`; a module is closed when its status is `completed` or `cancelled` (CE statuses: backlog, planned, in-progress, paused, completed, cancelled). Archived modules are left out.
- **One milestone per ticket.** Plane keeps a card in several modules (the v1 `module-issues` POST adds, never moves), so `set-field milestone` and `create --milestone` put the card in the target and `DELETE <P>/modules/<m>/module-issues/<id>/` from every other. A row shows its module; a card a human put in several shows the highest. `create` without `--milestone` picks the highest open module, never a track one; an unknown title exits 2 before anything is created.
- `close-milestone <title>`: `PATCH <P>/modules/<m>/ {"status": "completed"}`. Archiving stays a human's call.
- **Membership reads.** No work-item field names its cycle or modules on `/api/v1` (`expand` does not reach them), so a row's milestone comes from `GET <P>/modules/` once plus `GET <P>/modules/<m>/module-issues/?fields=id` per module holding cards (empty ones skipped, in parallel, read once per run).

Plane calls per verb, measured on the rig with three modules holding cards (GitHub calls for claims and branches not counted, cached config):

| Verb | Plane calls |
|---|---|
| `list` | 1 work-item list (per 1000 cards) + 1 modules + 1 per module holding cards (here 5); + members and `users/me` once when a card is assigned |
| `get` | 1 card + 1 parent (child of a sprint) + 1 relations + 1 per blocker + 1 modules + 1 per module holding cards (here 8) |
| `milestones` | 1 |
| `close-milestone` | 2 |
| `set-field milestone` | 1 card + 1 modules + 1 per module holding cards + 1 write per module changed (here 7) |
| `create --sprint --milestone` | 1 modules + 1 create + 1 module add + 1 work-item list (roots) + 1 parent + 1 cycles + 1 cycle add (here 7; first use of a sprint adds the root and the cycle) |
| `split` | 1 card + 1 modules + 1 per module holding cards (the ticket's row) + 1 work-item list (name clash) + 1 label + 1 cycles + 1 cycle create + 1 comment (here 10) |

### Comments

`comment_html`, and every `description_html` the script writes, come from the Markdown text through `plane_html`: the HTML Plane's own editor writes. Plane stores that HTML as sent and its editor parses HTML only, so Markdown sent as text shows raw (`##`, `**`, `[ ]`). Covered: paragraphs (line breaks kept), headings, `-` / `*` / `1.` lists (nested), `[ ]` / `[x]` task lists, fenced code (language kept), quotes, rules, GFM tables, bold, italics, strikethrough, inline code, links and bare URLs. Code inside a link shows as plain link text (Plane's inline code mark excludes every other mark), images as links, raw HTML as text; HTML comment lines are dropped, as on GitHub. Stdlib only.

### Checked live (issue 0009)

On the rig and `whackagent-playground-plane`, with four throwaway cards:

- `move WA-9 --top`, `move WA-6 --bottom`, `move WA-8 --before WA-1`, `move WA-7 --after WA-9` each gave the expected `list` order (values −65535, 161070, 32767.5, −32767.5). Moving relative to itself or to an unknown card exits 2.
- The web UI's drag was not performed in a browser. Its exact write was replayed instead: `PATCH {"sort_order": 16383.75}` (midpoint of the two neighbours) and `PATCH {"sort_order": 131070}` (last + 65535). `list` showed both cards where the UI would.
- Two cards set 1e-7 apart, then `move WA-9 --after WA-6`: two cards respaced (16383.75, 49151.25), WA-9 at 32767.5 between them, three PATCHes in all.
- `depend WA-7 --on WA-6`, then `--on WA-6,WA-8`, reported added and already-there correctly. With WA-7 in Grilled, `claim WA-7 coding` exited 4 naming both blockers, then naming only WA-8 once WA-6 was Done, and won once WA-8 was canceled. `--blocked-ok` won on a card whose blocker was open. `claim grilling` from Grilled is never checked.
- `cancel WA-8` moved it to Canceled; `list` hid it and `list --all` showed `not_planned: true`. A second `cancel` answered `already: true`; on a Done card and on a claimed card, exit 4.
- A comment with a list, a link and code read back from `GET …/comments/` as `<p>…</p><ul><li><p>…<a href="…">#3</a></p></li>…</ul>`.
- A second workspace user with the same display name as the key's user was assigned to a card: the previous script showed it `reserved: false`, this one `reserved: true`, and `claim` exited 3. With both users assigned, the claim won and `release` kept both assignments; on an unassigned card, `release` removed the key user again.

### Checked live (issue 0010)

On the rig and `whackagent-playground-plane`:

- `provision` with the project's cycles and modules switched off reported `features_enabled: ["cycles", "modules"]` and turned both on; a second run reported `[]` and changed nothing else.
- `create` WA-10 "0010 Checkout revamp", `split WA-10` → `{"sprint": "0010-checkout-revamp"}`, root labeled `wa-sprint`, cycle `0010-checkout-revamp` created without dates; a second `split` and `get WA-10` exit 4. Three `create --sprint 0010-checkout-revamp` (WA-11 `--milestone 0.9.0`, WA-12 default, WA-13 `--milestone ""`) gave the parent WA-10 on each, the three cards in the cycle, and `list` / `list --sprint "0010 Checkout Revamp"` showed the three with their sprint and milestones `0.9.0`, `0.10.0` (highest open of `0.10.0`, `0.9.0`, `0.2.1`) and none.
- `set-field WA-13 sprint ""` cleared the parent and took it out of the cycle; `set-field WA-13 sprint "0010 Side quest"` created root WA-14 and cycle `0010-side-quest`; moving WA-12 there and back moved it between the two cycles. A card under a plain parent exited 4; `split` of a ticket already in a sprint exited 4; `split` of a ticket titled like an existing sprint exited 4 naming the root.
- `set-field WA-11 milestone 0.2.1` moved it out of `0.9.0`. WA-12 put in a second module through the API showed the highest in `get`; `set-field WA-12 milestone 0.9.0` left it in `0.9.0` only; `""` removed it from every module; an unknown title exited 2.
- `depend WA-12 --on WA-11`: both `get` rows carry sprint `0010-checkout-revamp`, so the skills' same-sprint check sees a related blocker (stacking) instead of an unrelated one.
- `/wa-release` close step replayed: WA-11 set to Done, `list --milestone 0.2.1 --all` showed it done, `milestones` showed `0.2.1` 1/1, `close-milestone 0.2.1` set the module `completed` and `milestones` dropped it; `0.9.0` closed while holding an open card stayed listed after the open modules with `open: false`. Same shape and order as `milestones` on the GitHub playground.

## Hooks

The board hooks move the data-driven states from GitHub events, as `board.yml` does for a GitHub board, which stays untouched. Hook logic is Python, in the same script as the agents' verbs: `wa-backlog hook` reads the event name and payload from the Actions environment (`GITHUB_EVENT_NAME`, `GITHUB_EVENT_PATH`) and drives the same `PlaneBoard` adapter. One handler per event; an event without one is a no-op that exits 0. Each run prints one log line, a JSON result (`event`, `ticket`, `action`, `reason`) and a line in the job summary.

| Event | Rule |
|---|---|
| `push` to `<prefix><id>-<slug>` | the task file `{tasks}/<id>-*.md` at the pushed commit (read over the contents API, frontmatter `issue:` naming the ticket) has a non-empty `## Acceptance criteria` (HTML comments ignored, same rule as `board.yml`), and the card is in Todo or Grilling → Grilled, priority kept, claim ref `refs/wa-claims/<id>/grilling` deleted, `✅ grilled` comment with a sha permalink to the spec. Anything else (branch deleted, other branch, no task file, empty criteria, card elsewhere, sprint root, `wa-ignore`) → no-op with the reason. Idempotent: a second run finds the card in Grilled |
| `pull_request` (any action) | **Ticket**: the head branch `<prefix><id>-<slug>` naming a card of this project, else the one card link in the body (`<WA_PLANE_URL>/<workspace>/browse/WA-42/`; scheme, case and trailing slash ignored; links inside code, HTML comments and the run report ignored, as `Closes #n` is in `board.yml`). Several card links → reported on the PR (`board-check:several-tickets` marker, once), no move. A sprint branch PR (`WA_SPRINT_PREFIX`) is not a ticket PR. Every event that finds a ticket adds the PR as a work-item link `#<n> <title>` (read first, so a replay adds nothing). A card in a column outside the six states is left alone, unless a coding claim is held (then treated as `coding`) |
| `pull_request` `opened` / `reopened` | → Review from any state but Done, coding and grilling claims dropped, `🔀 review` comment. Already in Review → claims dropped, no comment. Either way, a card with no assignee gets the developer assigned (see *Assignees* below) |
| `pull_request` `edited` | → Review only when the PR is open and the card still sits in Todo or Grilled (the link was found late); coding claim dropped |
| `pull_request` `ready_for_review` / `converted_to_draft` | ready → `✅ ready` comment; nothing moves (already Review) |
| `pull_request` `synchronize` | coding claim held (end of an agent round) → Review, claim dropped, `🔀 review — round <sha> pushed` comment linking the new `## Feedback` rounds of the task file, and a `📝 feedback` comment on the PR with their line permalinks. No claim: Done or a GitHub merge commit (`web-flow`) → nothing; a round this hook already ended (its comment names the sha) → nothing; else reported on the PR (`board-check:push-no-claim-<sha>`, once) |
| `pull_request` `closed`, merged | → Done (claims dropped, every assignee removed, replay included), `🎉 done` comment with the PR body's run report; landed branch = the GitHub stack's base for a stacked PR. Ticket child of an open sprint root, landed elsewhere than the sprint branch, every child now Done or Canceled → root to Done, `🏁 sprint landed`. Already Done → only the sprint check runs |
| `pull_request` `closed`, sprint branch merged | the open sprint root of that name → Done, `🏁 sprint landed`. The cycle stays as Plane's record |
| `pull_request` `closed`, unmerged | → Grilled, coding claim dropped, `↩️ grilled` comment, unless the card is in Done or Grilled, a coding claim is held, or another PR linked on the card is still open |
| `schedule`, `workflow_dispatch` | report-only board check (see *Board check*): one card comment per problem, resolved in place once fixed, every problem in the job summary. Never writes a state |

**Assignees.** A card the hook moves to Review (opened, reopened, edited, a claimed round pushed) with nobody assigned gets the round's developer: the Plane user named by the claim the hook is about to drop (coding first, then grilling), read from the claim commit's `account:` trailer (a claim from before that trailer: its `assigned:` one). A GitHub login says nothing about a Plane account, so a PR opened without a claim leaves the card unassigned; the log line says so. A card already assigned is left alone. On merge, the hook removes every assignee, before moving the card, so a rerun after a half-failed run still clears them. Same rules as `board.yml`, where the developer is the event's sender (else the PR author).

**Wiring.** The project's caller `.github/workflows/whackagent-board-plane.yml` (template `providers/plane/whackagent-board-plane.yml`, own `template version`, installed by `/wa-setup`) holds the triggers (push on `wa/**`, pull request `opened`, `reopened`, `edited`, `ready_for_review`, `converted_to_draft`, `synchronize`, `closed`, schedule, manual), the permissions (`contents: write` for the claim refs, `pull-requests: write` for the PR comments) and the concurrency, and calls the reusable `rlatapy-luna/whackagent/.github/workflows/board-plane.yml@hooks-v2`, shipped additively under the same tag as the GitHub board's. The reusable workflow:

- runs on `runs-on: ${{ vars.WA_RUNNER_LABEL || 'self-hosted' }}`. In a called workflow `vars` are the caller repository's variables, as for `board.yml`, and `runs-on` may read them;
- skips pull requests from forks, so outside code never reaches the self-hosted runner, and fails with a clear error when `WA_PLANE_URL` is unset (a skipped job would read as a success while no card moved);
- checks out the **default branch** (sparse: `.github/board`, `.whackagent`, root files) and runs `python3 .github/board/wa-backlog hook`. The script and the config come from the default branch, never from the pushed ref, so a ticket branch cannot change the code that holds the API key. The task file is read from the pushed commit over the API;
- passes `PLANE_API_KEY` from the caller's `WA_PLANE_API_KEY` secret, `GH_TOKEN` = the caller's `GITHUB_TOKEN`, and `WA_VARS` = `toJSON(vars)`. `GITHUB_TOKEN` cannot list repository variables, so the script reads its settings from `WA_VARS` when set, and the repository from `GITHUB_REPOSITORY` in Actions.

**Runner.** Self-hosted, registered on the repository or its organization, carrying the label in `WA_RUNNER_LABEL` (default `self-hosted`), with `python3` and `gh` on its PATH. It reaches the Plane URL (localhost or the private network) and polls GitHub over outbound HTTPS, so Plane is never exposed. While no runner with the label is online, runs wait in `queued` (up to 24 hours) and the card waits with them. A push on a ticket branch forked before the caller reached the default branch triggers nothing: GitHub runs push workflows from the pushed commit's tree.

**When the card does not move.** The skill that pushed, opened or merged the PR re-reads the card for up to about three minutes, then looks the run up with `gh run list --workflow whackagent-board-plane.yml --branch <branch> --json status,conclusion,event,url,headSha` and reports it: failed (run URL), queued (runner offline, run URL), in progress, success (the summary line says why nothing moved), or `not triggered` (no run). It never sets the state itself (**reference/board-plane.md**, *Hooks*).

**Replay locally** (no runner): from a clone of the project, with `PLANE_API_KEY` exported and `gh` logged in,

```sh
wa-backlog hook --event push --payload scripts/plane-rig/payloads/push-task-file.json
wa-backlog hook --event pull_request --payload scripts/plane-rig/payloads/pr-opened.json
wa-backlog hook --event schedule --payload scripts/plane-rig/payloads/schedule.json
```

The recorded payloads under `scripts/plane-rig/payloads/` are real `push` and `pull_request` payloads from the playground, trimmed to the fields a hook reads (`push-*.json`, `pr-*.json`); edit `ref` and `after` (push), or the PR number, branch and body (pull request) to the ticket under test. `schedule.json` needs no edit: the check reads the whole board.

### Board check

The caller's `schedule` (weekdays, 06:17 UTC) and `workflow_dispatch` (`gh workflow run whackagent-board-plane.yml`) run `hook_check`, the rules of `check()` in `board.yml` read against the Plane board. It only reports: no state, claim, assignee or order is ever written.

| Problem (kind) | When |
|---|---|
| `lock-no-claim` | card in Grilling or Coding with no claim ref of that phase |
| `stale-grilling`, `stale-coding` | a claim with nothing new for `WA_STALE_AFTER_HOURS` (default 24): age = newer of the claim commit and the ticket branch head, as `claims` |
| `merged-not-done` | a PR linked on the card is merged, none is open, and the card is not in Done |
| `review-no-pr` | card in Review with no open PR for the ticket |
| `pr-not-review` | an open PR for the ticket while the card sits in Todo or Grilled |
| `grilled-no-spec` | card in Grilled with no ticket branch `<prefix><id>-…` (the spec lives in the task file on it) |
| `spec-todo` | the card description holds a non-empty `Acceptance criteria` heading section while the card sits in Todo: on Plane only a task file pushed on the ticket branch moves it (see `reference/board-plane.md`, *Spec in task file only*) |

- **Open PR for a ticket** = an open PR mapped the way the PR hook maps it (head branch naming a card of the board, else the one card link in its body; sprint PRs left out), or an open PR linked on the card. **Merged** comes from the card's PR links (what the hook adds, `link-pr` repairs), the Plane twin of the issue's linked PRs on GitHub.
- **Not checked, no Plane twin:** `closed-locked`, `closed-not-done` and `done-open` compare a GitHub issue's open/closed with its column; a Plane card's column is its status. Done and Canceled cards, columns outside the six states, sprint roots and `wa-ignore` cards are skipped, as `board.yml` skips an issue without a whackagent column.
- **Comment** on the card (the GitHub check comments on the issue): `⚠️ board check — <problem>. See BOARD.md; this check only reports, it never moves cards.` Once the problem is gone it is edited in place to `✅ board check — resolved`. Cards that closed (Done, Canceled) in the last 7 days are still read, so a problem cleared by landing gets resolved too.
- **De-dup marker.** The comment carries `<!-- board-check:<kind> -->` like `board.yml`, and Plane keeps it: `POST comments/` stores `comment_html` byte for byte, HTML comments and `data-` attributes included (checked on 1.4.2, see *Checked live (issue 0011)*). The run does not rely on it, though: a human editing the comment in Plane's editor re-serializes the HTML and drops it. The key is Plane's own integration id instead: `external_source: "whackagent"`, `external_id: "board-check:<key>:<kind>"`. The run reads the card's comments and posts only when no comment has that id, and Plane answers a second `POST` with the same pair `409` (`Work item comment with the same external id and external source already exists`), which counts as already posted. Resolving rewrites the id to `board-check:<key>:<kind>:resolved:<comment id>`, so the problem is reported again if it comes back. Plane's 409 is a check, not a unique index: three runs started at the same second posted three comments. The caller's concurrency group keeps scheduled runs one at a time; a manual run during a scheduled one could still double a comment, the same race `board.yml` has.
- **Job summary:** the one-line result, then a `Board check` table (ticket, problem, posted or already posted) and the problems resolved; or `Board matches the repository.` The JSON on stdout carries `violations` and `resolved`.

Calls per run (claim and branch head commits counted per claim held):

| Where | Calls |
|---|---|
| Plane | 1 work-item list (per 1000 cards) + 2 per ticket card not in Done or Canceled (comments, links) + 1 per card closed in the last 7 days (comments) + 1 `POST` per new problem + 1 `PATCH` per resolved problem |
| GitHub | 1 claim refs + 1 ticket branches + 1 open PR list (per 100 PRs) + 1 per closed PR linked on the card of a ticket with no open PR (merged or not) + per claim 1 claim commit (+ 1 branch head commit when the ticket has a branch) |

On the playground (36 cards: 9 open tickets, 22 cards closed that day, 1 claim): 41 Plane reads, 6 GitHub reads, plus one write per new or resolved comment.

### Checked live (issue 0007)

On the rig and `whackagent-playground-plane`:

- Replay, no runner: WA-20 (Grilling, claimed) with criteria → Grilled, claim ref gone, `✅ grilled` comment linking the spec at its sha; a second replay → no-op `card in grilled`. WA-21 with an empty criteria section (comment only) → no-op `Acceptance criteria empty`, still Grilling and claimed. A push to `main` → no-op `not a ticket branch`. An `issues` event → no-op `no hook for issues`. All exit 0.
- End to end: the playground ran the reusable workflow as a local copy (`uses: ./.github/workflows/board-plane.yml`, the whackagent remote not being pushed), with the vendored script on `main` and `WA_RUNNER_LABEL=whackagent-plane`. Pushing a spec on `wa/WA-22-hook-e2e` ran on the self-hosted runner (job label `whackagent-plane`, run 39592626482, success) and the card went Grilling → Grilled with its claim dropped about 13 seconds after the push.
- Runner stopped: a push on `wa/WA-21-hook-empty` forked before the caller landed started no run (`gh run list` empty: `not triggered`); rebased onto `main` and pushed again, the run sat `queued` (run 39592874393) with the card still in Grilling, then ran and moved the card once the runner was started.

### Checked live (issue 0008)

On the rig and `whackagent-playground-plane`, payloads recorded from real PRs (`scripts/plane-rig/payloads/pr-*.json`):

- Replay, no runner: WA-23 coding, draft PR #1 on `wa/WA-23-pr-replay` → `opened`: Review, coding claim gone, link `#1 hook pr 0008 replay` on the card; replayed → no-op `card already in review`. A feedback round pushed under a coding claim → `synchronize`: Review, claim gone, card comment linking the `### Round 1` lines, `📝 feedback` comment on the PR with the line permalink; replayed → no-op `already handled`. A push without a claim → reported once on the PR (replayed: no second comment). `ready_for_review` → `✅ ready`. Merged with `wa-backlog merge 1 --method squash` while `/wa-close`'s coding claim was held → Done, claim gone; replayed → no-op `card already in done`.
- WA-24: closed unmerged while a coding claim is held → no-op; claim released → Grilled; replayed → no-op. WA-25: PR #3 on `cloud/agent-task-7` with only the card link in its body (`http://localhost:8390/whackagent/browse/WA-25`, no trailing slash; a link to WA-99 inside backticks ignored) → Review and linked; two card links → reported on the PR, nothing moved; no link → no-op; a second PR closing while #3 is open → no-op `#3 still open`.
- Sprints: WA-26, only child of sprint `hook-sprint-0008`, merged into `main` → Done and the root WA-27 → Done (`🏁 sprint landed`). PR #5 from `sprint/hook-sprint-b0008` merged with a merge commit → root WA-29 → Done; replayed → no-op `no open sprint`.
- End to end on the self-hosted runner (label `whackagent-plane`): WA-30 grill push → Grilled (run 39595759885); coding round + draft PR #6 with the card link → Review, claim dropped, PR linked (run 39595860994); validate round push + `gh pr ready` → Review, `✅ ready` (runs 39595976917, 39595978931); `wa-backlog merge 6 --method squash` → Done within 10 s (run 39596123989). No step set Review or Done itself. WA-31: draft PR #7 → Review (run 39596301368), closed unmerged → Grilled (run 39596354563).

### Checked live (issue 0011)

On the rig and `whackagent-playground-plane`:

- Marker probe on WA-32: comments posted with `<!-- board-check:… -->` before or inside a `<p>`, a `data-wa-check` attribute, `<code>`, `<sub>` and `<small>` all read back unchanged from `GET …/comments/`. A comment with `external_source` / `external_id` posted twice → `201` then `409` naming the first comment; after a `PATCH` of its `external_id` (`200`) the same pair posted again (`201`).
- Replay (`hook --event schedule --payload scripts/plane-rig/payloads/schedule.json`), seeded through the API, no claim refs written: WA-33 in Coding → `lock-no-claim`; WA-34 in Review → `review-no-pr`; WA-35 in Todo with an `<h2>Acceptance criteria</h2>` list → `spec-todo`; WA-36 in Grilled linked to merged PR #6 → `merged-not-done` + `grilled-no-spec`; WA-38 in Grilled with draft PR #8 on `cloud/check-0011` holding its card link → `pr-not-review` + `grilled-no-spec`. First run: 7 problems, 7 comments posted, job summary table with the 7 rows. Second run: 7 problems, `already posted` each, no write. Every card's state, `sort_order`, assignees and parent compared before and after: identical.
- With `WA_STALE_AFTER_HOURS=0` (passed through `WA_VARS`), WA-37 claimed in Grilling → `stale-grilling` posted; back to 24 → resolved in place. WA-33 set to Todo → `lock-no-claim` resolved; back to Coding → a new comment, the resolved one kept.
- End to end on the self-hosted runner (label `whackagent-plane`), after WA-35 moved to Grilling without a claim: `gh workflow run whackagent-board-plane.yml` → `lock-no-claim` posted on WA-35, its `spec-todo` resolved, the other 6 already posted (run 39598335234); run again → 7 problems, 0 new comments, 0 resolved (run 39598425993). No card changed.

### Checked live (issue 0014)

Cross-repository call, the way projects run it: the playground's caller switched from its local copy to `uses: rlatapy-luna/whackagent/.github/workflows/board-plane.yml@hooks-v2` (the tag on the 1.8.0 release commit; `rlatapy-luna/whackagent` is public, so no Actions access setting is involved). `gh workflow run whackagent-board-plane.yml` ran the board check on the self-hosted runner picked by the caller repository's `WA_RUNNER_LABEL=whackagent-plane` (job label `whackagent-plane`, runner `rlatapy-macbook-whackagent`, log `Uses: rlatapy-luna/whackagent/.github/workflows/board-plane.yml@refs/tags/hooks-v2`), success (run 39605230271): `vars` inside the called workflow are the caller's, so `runs-on` reads them across repositories too.

## Migration

`wa-backlog migrate` moves a project from its GitHub board to Plane. `/wa-setup` reconfigure drives it (*Switch board to Plane*) after `check-integration` and `provision --plane-url …`, which writes the `WA_PLANE_*` variables beside the GitHub board's: the source is the board those GitHub variables name, the target the provisioned Plane project (`--plane-url`, `--workspace`, `--project` are only checked against the variables). It is a provider switch, not a setup migration: it writes board data, never project files. The config, the caller swap and `BOARD.md` for `plane` go in the setup PR afterwards, like every board file.

- **Dry run** (no flag): reads both boards and prints the plan, writing nothing on GitHub or Plane. Per ticket in board order: source `#n`, title, state, position, sprint, milestone, comment count, blockers, `card` (`create` or its key), comments still to post, the branch rename (`wa/12-search` → `wa/MIG-?-search`, the key is known once the card exists) with its task file, and the issue step. Then the modules to create, the sprint parent issues to close, the dependencies (`dropped`: blocker done or canceled, so not moved), `not_copied` (assignees and size per ticket, `grilled_no_branch`, drafts, `wa-ignore` issues, done and canceled counts, open issues missing from the board), the archive line, the setup PR files and a `summary` of counts.
- **Refusal:** any ticket in Grilling, Coding or Review or in a column outside the six states, any claim ref, or an open PR on a ticket (head branch `<prefix><n>-…` or a closing keyword `Closes #n` in its body) → the plan with `refused` only, one row per ticket with every reason, exit 4. Nothing is written. The user lands, releases or cancels each ticket, then runs it again.
- **Apply** (`--apply`), per ticket in GitHub board order:
  - **Card** in Todo or Grilled: the issue title, the body (converted like a comment: paragraphs, lists, bold, code, links) plus a line `↪ Moved from GitHub owner/repo#n, opened by @login on <date>`, `external_source: whackagent-migrate`, `external_id: github:<owner>/<repo>#<n>`. Plane refuses a second work item with the same pair (409, *Verified API facts*), so a card is never created twice.
  - **Order:** each card goes below the previous migrated card. Plane takes the `sort_order` sent on create only in an empty column and otherwise drops the card at the bottom of its own column (a Grilled card would land among the Todo ones), so every run checks the migrated cards in board order and moves one only when it sits above the card before it.
  - **Milestone:** a module named like the GitHub milestone. The modules are created first, one per open GitHub milestone plus any closed one a ticket still sits in (`completed` status), so `create` keeps landing new work in the highest open one. **Sprint:** `set-field sprint` logic, the root created on first use plus its cycle.
  - **Comments**, oldest first, each `**@login** on GitHub, <date> (originally posted there):` then the text. The Plane author is the API key's user (the API cannot post as someone else), but `created_at` is sent with the GitHub date and Plane stores it, so the card's activity shows the original dates. Each carries `external_id: github:<owner>/<repo>#<n>/comment/<id>`: already posted → skipped, a racing duplicate → 409. Board check comments and the migration's own link comment are not copied; claim trail comments are (they are the ticket's history).
  - **Ticket branch** (any ticket with one, normally the Grilled ones): one local commit `task: grill <key> <slug>` whose parent is the old branch's fork point (the closest remote branch that is not a ticket branch: base, sprint or track branch) and whose tree is the old tip's with `{tasks}/<n>-<slug>.md` renamed `{tasks}/<key>-<slug>.md` and `issue: <key>`. The old commits are squashed into it (their subjects listed in its body) so the ticket range (`task: (grill|spec) <key>`) starts there and a rebase replays the whole spec. The branch is written as a local ref only (plumbing, the working tree never changes); `--push` pushes it and deletes the old remote branch.
  - **Issue:** a comment `<!-- wa-moved -->` `➡️ moved to Plane — ticket is now [MIG-9](…)`, the `wa-moved` label (created once), closed as not planned. Each part is checked first.
  - Then **dependencies** (`depend` with the mapped keys, idempotent) and the open **sprint parent issues**, closed the same way with a link to the Plane root.
- **Not copied:** size (a Plane board has none), assignees (re-assign in Plane), done and canceled tickets (their history stays on GitHub). The GitHub Project is never written: it stays as the archive. Its built-in *Item closed* workflow, on by default, moves each closed issue to Done there; the `wa-moved` label tells the moved ones apart.
- **Resumable:** every step is keyed on what it leaves behind, so a rerun after any failure finishes the job without a duplicate: card and comment external ids, the new branch ref (local, then remote) and the old remote branch gone, the marker comment, label and closed state. A ticket whose issue is already closed with `wa-moved` stays in the plan until all its steps are done. `WA_MIGRATE_FAIL_AFTER=<n>` (maintainer test hook) fails the run right after its n-th write.
- **After the switch:** the moved Grilled branches still carry the GitHub caller (forked before the setup PR), so their pushes trigger nothing on Plane until rebased onto the base; pull request events run from the base and work at once. `wa-backlog` keys its per-clone cache on the configured board too, so the clone that flips `backlog.provider` rebuilds it.

### Checked live (issue 0013)

On `rlatapy-luna/whackagent-playground-migrate` (private, user Project 9, provisioned as a GitHub board, caller installed and disabled: no `WA_PROJECT_TOKEN`, so seeding used the script's verbs) into project `MIG` on the rig:

- Seed: 7 Todo tickets in a set order (#4 #1 #5 #2 #3 #6 #8; #1 with two comments, #3 assigned, #2 sized `large`, #6 and #8 children of sprint `checkout-flow` = parent #7), milestones `0.1.0` and `0.2.0`, two Grilled tickets with branches (`wa/9-search-bar`: grill + re-grill commits; `wa/10-push-notifications`), #10 blocked by #1, and #11 claimed into Coding.
- `migrate` and `migrate --apply --push` with #11 in Coding → exit 4, `#11 (coding; claim held (coding))`; issues, branches, refs, labels, Project statuses and the Plane project compared before and after: identical. #11 released, then set Grilled with no branch (the `grilled_no_branch` case).
- Dry run: 10 cards, 9 comments, 2 branches, 11 issues (10 tickets + sprint parent #7), 2 modules; assignee #3 and size #2 listed as not copied; snapshot identical before and after.
- `WA_MIGRATE_FAIL_AFTER=11 migrate --apply` stopped after #1's first comment; `WA_MIGRATE_FAIL_AFTER=37` after #9's local branch commit and link comment; `migrate --apply` finished, `migrate --apply --push` pushed both branches and deleted the old ones; a last `--apply --push` made 0 writes and the dry run planned nothing.
- Result: MIG-1 … MIG-11 in the GitHub order (MIG-7 = sprint root), Todo / Grilled as on GitHub, modules `0.1.0` = MIG-1 2 4 10 and `0.2.0` = MIG-5 6 8 9 11, cycle `checkout-flow` = MIG-6 8 with MIG-7 as parent, MIG-10 blocked by MIG-2, every comment once with its GitHub date. `wa/MIG-9-search-bar` = one commit on `main` holding `.whackagent/tasks/MIG-9-search-bar.md` with `issue: MIG-9`; the ticket range grep finds it. Issues #1–#11 closed as not planned with `wa-moved` and the link comment; the Project's *Item closed* workflow moved them to Done there.
- Setup PR (#12, merged): config `plane`, GitHub caller removed, Plane caller added (`board-plane.yml@hooks-v2`), `BOARD.md` and PR template rendered for `plane`. Then `wa-backlog list` from the clone lists the Plane board, `get MIG-10` shows its branch and blocker.

## Settings

| Where | Name | Holds |
|---|---|---|
| repository variables, written by `provision` | `WA_PLANE_URL`, `WA_PLANE_WORKSPACE`, `WA_PLANE_PROJECT_ID` | server, workspace slug, project id |
| | `WA_PLANE_STATES` | JSON `{state: Plane state id}` for the six board states plus `canceled`, so a state renamed in the UI still maps |
| | `WA_TASKS_PATH`, `WA_BRANCH_PREFIX`, `WA_SPRINT_PREFIX`, `WA_STALE_AFTER_HOURS`, `WA_TRACKS` | code-host settings, same as the GitHub provider |
| agent environment | `PLANE_API_KEY` | the API key (header `X-API-Key`). Never in the repo, the config or the cache |
| Actions secret | `WA_PLANE_API_KEY` | the same key, for the hooks |
| repository variable, set by `/wa-setup` | `WA_RUNNER_LABEL` | label of the self-hosted runner the hooks run on; unset = `self-hosted` |

The per-clone cache (`<git-common-dir>/whackagent/github-cache.json`) holds the ids `settings` resolves: project key (`WA`), state names and groups, label ids. It is rebuilt when the variables change, when the board holds a state the cache doesn't know, or on `config --refresh`.

## Mapping

| Contract | Plane |
|---|---|
| ticket id | work item key `<PROJECT>-<n>` (`WA-42`), looked up with `GET workspaces/<slug>/work-items/WA-42/`. A bare number or another project's key exits 2 |
| title / summary | work item name / first line of its description (HTML, stored by `create` as one `<p>` per paragraph) |
| state | Plane state, by id from `WA_PLANE_STATES`. Canceled (cancelled group) = `closed` + `not_planned`, `state: null`. A column no state maps to: `state: null`, `column: <name>` |
| priority | `sort_order`, one order over the board (each column shows its slice), lower is higher; `list` reads `?order_by=sort_order`, paged 1000 rows a call; `move` writes it like a UI drag (see *Priority*) |
| create | `POST work-items/` with the todo state: Plane puts it at the bottom of Todo |
| excluded | label `wa-ignore`; label `wa-sprint` marks a sprint root (both created by `provision`) |
| sprint | parent work item labeled `wa-sprint` (the truth, name in kebab-case) + cycle of the same name (Plane's view, no dates) |
| milestone | module, one per ticket; closed = status `completed` or `cancelled` |
| reservation | assignees, compared by user id, shown by display name; `reserved` when assigned and the key's user is not among them; a winning claim assigns the key's user |
| state change | `PATCH {state, sort_order}`, priority kept (see *Claims*) |
| comment | work item comment, `comment_html` (see *Comments*) |
| dependencies | relations `blocked_by`: `depend` adds (never removes), `get` reads back |
| cancel | Canceled state (cancelled group), priority kept |
| web link | `<url>/<slug>/browse/WA-42/` |
| pull request | work-item link `#<n> <title>` to the PR, added by the hooks (`link-pr` repairs); the PR body names the card by its web link |

## Provision

`wa-backlog provision --plane-url <url> --workspace <slug> --project <identifier or id>` (plus the code-host flags of the GitHub provider). It adopts an existing project, never creates one. Idempotent: a second run reports nothing created or updated and leaves states, labels and variables byte-for-byte the same.

- **States:** adopts each of Todo, Grilling, Grilled, Coding, Review, Done, Canceled by name (`--state grilled="Ready for dev"` maps another name; Plane's seed `Cancelled` is adopted as Canceled, not renamed), creates the missing ones, sets their group and their order (sequence 10000 … 70000), and makes Todo the default (clearing any other default, the Plane bug below).
- **Never removes on its own.** Columns no state maps to (Plane's seed `Backlog` and `In Progress`, team columns) stay and are listed in `states_extra`. `--prune-status <name>` deletes a named one; one still holding cards stays (Plane refuses) and is listed in `states_held` with its cards.
- **Labels:** `wa-ignore`, `wa-sprint`.
- **Features:** switches the project's cycles and modules on when off (`features_enabled`).
- **Report:** also `secret_WA_PLANE_API_KEY` (hooks secret present) and `api_rate_limit_lifted` (read from `X-RateLimit-Remaining`).

## Board contract

The project's `BOARD.md` is rendered from `templates/BOARD.md` for `plane`: the shared rules, identical for every board tool, plus the `This board: Plane` section (where the board is, the columns, what counts as a spec, the card link, sprints, modules, relations, the single writer, the runner, the board check). Setup keeps the `<!-- board-tool: plane -->` blocks of `BOARD.md` and of the PR template sections, drops the GitHub ones, and installs the pointer blocks, all in the setup PR beside the caller. The stamp is `board-contract: 2.5`, the script's `CONTRACT_VERSION`. A project set up before the section existed has no `BOARD.md`: `/wa-setup` reconfigure offers it.

## Single-writer guard

`wa-backlog check-integration [--plane-url <url> --workspace <slug>]` (defaults: the `WA_PLANE_*` variables; needs `PLANE_API_KEY`). `/wa-setup` runs it before `provision` and stops while the answer is `on`.

- Reads the edition from `GET /api/instances/` (public), then `GET /api/workspaces/<slug>/workspace-integrations/` with the API key. Only a JSON answer counts: the web app answers unknown paths such as `/silo/…` with its HTML page and a 200.
- `on`: the list names a GitHub integration. `off`: the list names none, or the route is absent (404) on `PLANE_COMMUNITY`. `unknown`: any other answer, such as a 401 or a 404 on another edition, where the integration may live in a separate service the API key cannot read. Setup then asks the user to look in Plane. `fix` (not on `off`) says where to turn it off.
- Checked live (issue 0012) on the rig: `off`, edition `PLANE_COMMUNITY`, route 404, both with flags and from a playground clone through the variables. The `on`, `unknown` and other-integration answers were checked only against a local stub server answering in the legacy list shape (`integration_detail.provider`), **not against a real Plane with the integration installed**: no commercial edition was available. The route and the shape on a commercial server are unverified.

## Verified API facts

Checked on 2026-10-21 against Plane CE **v1.4.2** (`edition: PLANE_COMMUNITY`, latest stable self-host release at the time), started by `scripts/plane-rig/rig`, with a workspace API key (`X-API-Key`) on the public REST API `/api/v1/`. Every observation below can be replayed with `scripts/plane-rig/factcheck`, which works in a throwaway project `FC` and prints one line per check. `<P>` stands for `workspaces/<slug>/projects/<project id>`.

### Can the API create states, estimates, cycles and modules?

| Object | Through `/api/v1` | Evidence |
|---|---|---|
| States | **Yes**: create, rename, recolor, reorder, delete | `POST <P>/states/` → 201. `PATCH <P>/states/<id>/` → 200. `DELETE` → 204 for an empty, non-default state. |
| Estimates | **No** | `GET` and `POST <P>/estimates/` → 404 `Page not found`. The view exists in the source (`plane/api/urls/estimate.py`) but 1.4.2 does not mount it. The app API (`/api/workspaces/…/estimates/`) is session-only: 401 with an API key. |
| Estimate on a work item | **Yes**, by point id | `PATCH <P>/work-items/<id>/ {"estimate_point": "<point id>"}` → stored. `GET …?expand=estimate_point` returns the point object, so its value can be read back. |
| Project estimate switch | **Yes** | `PATCH <P>/ {"estimate": "<estimate id>"}` → 200. |
| Cycles | **Yes**, once enabled | `POST <P>/cycles/` without dates → 201 (dates are both or none: one alone → 400). With the project's cycles off → 400 `Cycles are not enabled for this project`; reads work either way. |
| Modules | **Yes**, once enabled | `POST <P>/modules/` → 201, status `planned`. `PATCH status=completed` → 200, `POST <P>/modules/<id>/archive/` → 204. |
| Project features | **Yes** | A new project has `cycle_view` and `module_view` false. `PATCH <P>/ {"cycle_view": true, "module_view": true}` → both true. |

What this means for the adapter:

- `provision` can create the seven states, switch on cycles and modules, and turn the project estimate on. It cannot create the estimate or its `quickwin` / `medium` / `large` points. Either a human creates them once in the project settings (Estimates, type Categories), or the rig-style Django shell does it on a server the maintainer runs. The adapter must look the point ids up by value: `GET <P>/work-items/?expand=estimate_point` gives them once at least one card has a size, otherwise the ids come from settings.
- Every new project is seeded with Backlog (backlog group, **default**), Todo, In Progress, Done and Cancelled. The rig keeps Todo and Done, renames Cancelled to Canceled, deletes Backlog and In Progress, and makes Todo the default so a card created without a state lands in todo (verified: create without `state` → Todo).
- Plane bug to work around: `PATCH <state> {"default": true}` through `/api/v1` does **not** clear the previous default (the serializer gets no project context), so after it both Backlog and Todo report `default: true`. The old default must be patched to `false` before it can be deleted (`DELETE` on a default state → 400 `Default state cannot be deleted`).
- `POST <P>/states/` ignores `sequence` and appends the state at the end. Order the columns with a `PATCH` afterwards.
- Triage states (`is_triage`) are hidden from `/api/v1` and left alone.

### How does sort order behave on reorder?

`sort_order` is a float on each work item. Plane never renumbers it.

- **On create**, a card gets the highest `sort_order` in its state plus 10000, so it lands at the bottom of that column. The first card in an empty state gets 65535. Observed: FC-1 = 65535, FC-2 = 75535, FC-3 = 85535, and a fourth card created without a state = 95535.
- **On reorder**, the client writes the new value and nothing else moves. `PATCH FC-3 {"sort_order": 70535}` stored 70535, and FC-1 and FC-2 kept 65535 and 75535. Negative values are accepted (`-5` → 200).
- **The web UI** drags with the same arithmetic (checked in the 1.4.2 frontend bundle): dropping at the top writes the first card's value minus 65535, at the bottom the last card's value plus 65535, and between two cards their midpoint. Lower value means higher on the board.
- **On a state change**, `sort_order` is kept as is (Todo → Grilling: 65535 → 65535). The card lands wherever that number falls in the new column, so the adapter must set it explicitly when the contract wants a position (for example, the bottom of `grilled`).
- **Reading in priority order:** `GET <P>/work-items/?order_by=sort_order` returned `FC-1 FC-3 FC-2 FC-4`, which is the reordered sequence. Without `order_by` the list is newest first. The list does not filter by state server-side (`pql` and `filters` are refused on CE), so `list` sorts and filters client-side.
- Midpoints halve the gap on each insert between the same two cards. After about 50 inserts in one gap, floats stop separating them. `move` respaces the crowded cards when a gap gets too small (see *Priority*).

### Do relations and parent work items work?

**Yes, both.**

- `POST <P>/work-items/<b>/relations/ {"relation_type": "blocked_by", "issues": ["<a>"]}` → 201. `GET` on b lists a under `blocked_by`, and `GET` on a lists b under `blocking`. Posting the same relation again → 201 with still one entry, so `depend` is idempotent for free.
- There is **no route to remove a relation** in `/api/v1`: only `GET` and `POST` are mounted on `relations/` (`relations/remove/` → 404). The contract's `depend` only adds, so this is fine, but a dependency added by mistake has to be removed in the UI.
- `POST <P>/work-items/ {"parent": "<root id>"}` stores the parent, `PATCH {"parent": "<root id>"}` sets it on an existing card, and `PATCH {"parent": null}` clears it (200). The list has no server-side parent filter, so children are found by filtering `parent` client-side. `sub_issues_count` is not in list rows.
- Lookup by display id works: `GET workspaces/<slug>/work-items/FC-1/` → 200 with the same id. The adapter can use `WA-42` directly.
- Cycles: `POST <P>/cycles/<c>/cycle-issues/ {"issues": [...]}` adds cards. **A card is in at most one cycle.** Adding it to another cycle moves it silently (a in sprint-a: false, in sprint-b: true). `DELETE <P>/cycles/<c>/cycle-issues/<id>/` → 204.
- Modules: `POST <P>/modules/<m>/module-issues/ {"issues": [...]}`. **A card can be in several modules** (a in 1.0 and in 1.1). The adapter must enforce "one milestone per ticket" itself.
- Links: `POST <P>/work-items/<id>/links/ {"url", "title"}` → 201. The same URL again on the same card → 400, so `link-pr` must read before writing, or treat 400 as "already linked".

### Does CE ship the GitHub integration?

**No.** CE v1.4.2 has no GitHub integration to disable.

- The backend mounts no integration routes. `/api/workspaces/<slug>/workspace-integrations/`, `/api/workspaces/<slug>/integrations/` and `…/github-repository-sync/` all return **404**. An existing session-only route returns 401 to an API key, as estimates do, so 404 means the route is absent, not forbidden. In the source, `plane/app/urls/` has no integration route apart from the GPT one. Legacy `GithubRepository` models remain in the database layer, with no view using them.
- The CE compose has no integration service. Plane's commercial editions run a separate integrations service, and it is not part of the community stack.
- `is_github_enabled` in `/api/instances/` is the GitHub **OAuth sign-in** switch (`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`), which does not sync issues or PRs. It is `false` on the rig.
- The web bundle still ships the integration i18n strings and a `syncGithubRepository` client call, but the backend answers 404.

So the single-writer rule holds by default on CE. Setup still checks it (*Single-writer guard*), because a Plane Commercial server could have the integration enabled.

### Does CE apply API rate limits?

**Yes: 60 requests per minute per API key by default, and the server admin can lift it.**

- The default comes from the `API_KEY_RATE_LIMIT` environment variable (`60/minute` in the official `variables.env` and compose). It is a Django REST Framework throttle keyed on the `X-API-Key` value (`plane/api/rate_limit.py`), so it applies to every `/api/v1` call made with that key. Each token row also has an `allowed_rate_limit` column, but 1.4.2 does not read it.
- Every response carries `X-RateLimit-Remaining` and `X-RateLimit-Reset` (a Unix timestamp).
- 100 `GET users/me/` calls in a burst got 60 × 200 and 40 × 429. The first 429 came at request 61, with `Retry-After: 59`.
- The limit has no off switch: the value goes straight into DRF's `SimpleRateThrottle`, and an empty value breaks parsing. A huge per-second rate lifts it in practice and keeps the throttle history tiny. With `API_KEY_RATE_LIMIT=1000000/second` and the API container recreated, 400 parallel calls on one key all got 200, none 429 (the variable is read at start-up, so a plain restart without recreating the container does not pick up a change).
- **The provider requires the limit lifted:** set `API_KEY_RATE_LIMIT=1000000/second` in the server's `plane.env`. The rig ships with that value. The adapter still honours `Retry-After` on a 429, so a server left at the default degrades to slow, not broken.

## Runtime footprint

Measured on the rig (macOS arm64, Docker Desktop 29.x VM with 18 CPUs and 7.7 GiB of RAM), idle, after bootstrap.

- **Containers:** 12 running services plus 1 one-shot `migrator` that exits after the migrations. The services are web, space, admin, live, api, worker, beat-worker, proxy, plane-db (Postgres 15.7), plane-redis (Valkey 7.2), plane-mq (RabbitMQ 3.13) and plane-minio (S3 storage).
- **RAM:** about **2.3 GiB** in total. `worker` alone takes 1.3 GiB, because Celery starts one process per CPU (19 processes on 18 CPUs). On a 2 to 4 core server it is a few hundred MiB, which puts the total near 1.2 to 1.5 GiB. The other services: api 173 MiB, mq 172, beat-worker 149, live 145, space 110, minio 111, db 72, proxy 31, web 13, redis 11, admin 6.
- **Disk:** about **4.6 GB** of images (plane-live 1.64 GB and plane-space 1.43 GB are the largest; layers are partly shared), plus about 80 MB of volumes on a fresh bootstrap, almost all of it Postgres.
- **CPU:** under 1 % per container when idle.
- **Self-hosted runner:** the GitHub Actions runner v2.338.0 takes 439 MB on disk once unpacked and about 110 MiB of RAM idle (`Runner.Listener`), and runs one job at a time. It polls GitHub over outbound HTTPS and reaches Plane over localhost or the private network, so Plane is never exposed to the internet.

Plane CE also needs a host with Docker Compose v2, and the upstream compose pulls images from Docker Hub. The upstream v1.4.2 compose references `minio/minio:latest`, which no longer pulls (the Docker Hub org is gone). The rig uses `pgsty/silo`, the same switch upstream made after 1.4.2 (makeplane/plane#9962). Production installs on 1.4.2 need the same fix.

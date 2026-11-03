## Plane board

`backlog.provider: plane` means the board runs on **lb-board**, Lunabee's Plane board plugin
(LunabeeStudio/Lunabee-Plane, internal).

**Where things live**
- Tickets are work items of the Plane project.
- Code, branches, PRs and claims stay on GitHub (`vcs.provider: github`).
- The repository vendors lb-board's CLI as `.github/board/lb-board`, and its board contract as
  `.github/board/BOARD.md`. That contract holds the worker rules; the bullets below are whackagent's way of meeting
  them.
- The code-host side (script, task file, claims, rounds, PRs) is in **reference/code-github.md**.
- `wa-backlog` forwards every board verb to `.github/board/lb-board`, with the same verbs, flags, JSON and exit
  codes. It adds `phase` and `branch` where whackagent reads them.
- Missing script → exit 2 `no .github/board/lb-board`: tell the user to run `/wa-setup`, and stop.

- **No `{backlog}` file, no local mirror.** The board is the Plane project. Never write order, state or title into a
  file.

- **Ticket id = work item key** (**reference/code-github.md**, *Ticket id*): `<id>` = `<#id>` = `WA-42`, the project
  identifier plus sequence number as Plane shows it, never `#WA-42`.
  - Branch `wa/WA-42-login-apple`. lb-board finds the key anywhere in a branch name; whackagent keeps
    `<branch.prefix><id>-<slug>`.
  - Task file `{tasks}/WA-42-login-apple.md`.
  - Claim ref `refs/lb-claims/WA-42/coding`.
  - A bare number (`42`) or another project's key → exit 2: ask the user for the full key.

- **Spec in task file only.**
  - Grill writes the task file on the ticket branch as usual.
  - lb-board's spec path (`PLANE_SPECS_PATH`) is `{tasks}`, so a pushed task file with a non-empty
    `## Acceptance criteria` moves the card to `grilled`.
  - The card description never moves the ticket, by design: not a gap to fill. No task file pushed → the card stays
    `todo`.

- **Priority = Plane `sort_order`**, one order over the whole board. Humans drag cards in Plane, `list` returns that
  order, and `move` writes the value a UI drag would.

- **No size.** Plane CE can't create estimates over its API.
  - Rows have `size` null.
  - `set-field size` → exit 2.
  - `create` drops `--size` with a note.
  - Never ask the user for a size here.

- **Canceled = Canceled column** (`not_planned: true`), set by `cancel <id> --reason` on the user's yes.
  - Label `lb-ignore` means not a ticket: `get` exits 4.

- **Sprint = parent work item + cycle.**
  - The root is labeled `lb-sprint`. It is not a ticket: `list` skips it, `get` and `claim` exit 4. It keeps its
    column, since Plane has no off-board.
  - Tickets are its children, mirrored in the cycle of the same name.
  - `split <id>` makes a ticket the root of its own sprint and creates the cycle.
  - `create --sprint` and `set-field <id> sprint <name>` set the parent and the cycle. `""` detaches both.
  - A ticket under a non-sprint parent → exit 4. Never detach a human's hierarchy.
  - **Card in a cycle, no parent** (`get` → `stray_sprint` names that sprint): a human dropped it in the cycle by hand,
    so it is not in the sprint.
    - Before picking the fork point, ask the user whether it joins. Recommended: yes.
    - Yes → `set-field <id> sprint <name>`, fork from the sprint branch.
    - No → fork from base.
    - AFK → join, and say so in the report.
  - The hooks close the root when the sprint lands. A root left open with nothing to land: no verb closes it, so tell
    the user to move it to Done (Canceled when nothing shipped) in Plane.

- **Milestone = Plane module.**
  - Humans create modules. Highest = version order of names (**reference/milestones.md**).
  - One per ticket: `set-field <id> milestone` and `create --milestone` put the card in that module and out of every
    other.
  - `close-milestone` (`/wa-release` only) sets the module to `completed`.

- **Dependencies = Plane relations** ("blocked by"): `depend`, and `get` → `blocked_by`, as on GitHub.
  - Add-only: a dependency added by mistake is removed by the user in Plane.

- **Settings** are lb-board's repo variables `PLANE_*`, written by `/lb-board-setup`.
  - whackagent's own `WA_TASKS_PATH`, `WA_BRANCH_PREFIX`, `WA_SPRINT_PREFIX`, `WA_STALE_AFTER_HOURS` and `WA_TRACKS`
    stay as its workflow settings.
  - The API key is the env var `PLANE_API_KEY`, never in the repo, config or chat.
  - Script says `PLANE_API_KEY not set` → ask the user to export it, stop.
  - `Plane rate limit hit` → it retries by itself; tell the user to lift the limit on the server.

- **Ticket branch = plain branch.** There is no GitHub issue to link.
  - Wherever a skill says `gh issue develop <id> --name <branch> --base <fork point> --checkout`, instead run
    `git switch -c <branch.prefix><id>-<slug> origin/<fork point>` and `git push -u origin <branch>` right away.
  - Worktree: `git worktree add -b <branch> {worktrees}/<id>-<slug> origin/<fork point>`, then push from there.

- **Claims:** same verbs and exit codes as **reference/code-github.md**, *Claim, reservation*, run by lb-board.
  - A winning claim moves the card to `grilling` or `coding`, assigns the Plane user owning the API key, and
    comments on the card.
  - `@<login>` in exit 3 with `assigned: true`, and `whoami` → `login`, is the Plane display name.
  - The GitHub account is `whoami` → `vcs_login`.

- **PR link.** Where the GitHub board writes `Closes <#id>` (**reference/pull-requests.md**), Plane writes the card
  link `[<#id>](<ticket url>)` (from `get <id>` → `url`). Never `Closes`, never `#WA-42`.
  - The hook finds the ticket from the key in the branch name, else in the PR title, else from the one card link in
    the body.
  - It then links the PR on the card. Never link by hand; `link-pr` is repair only.
  - A PR naming two tickets moves nothing, and the hook reports it on the PR.

- **Hooks.** The "Lunabee Plane board" GitHub App's receiver runs `.github/board/lb-board hook` on every push and
  PR event. No Actions caller, no runner.
  - Task file with acceptance criteria pushed → `grilled` (from `todo` or `grilling`; grilling claim dropped).
  - PR opened → `review`. A round pushed to the PR while a coding claim is held → `review`, claim dropped, new
    `## Feedback` rounds linked.
  - Ready → ✅ comment.
  - Merged → `done`, run report posted on the card, every assignee removed.
  - `review` on an unassigned card → the Plane user of the dropped claim is assigned.
  - Closed unmerged → `grilled` if the head holds the task file, else `todo`. Skipped when a coding claim or another
    open PR keeps the ticket going.
  - Sprint landing as above.
  - A push without a claim is not reported.

  **Board check.** `.github/board/lb-board check` reports problems and never moves a card. Fix it yourself (claim,
  release, open the PR) or tell the user; never by moving a card by hand.

  **Confirm the card moved** after every push or PR action the hook acts on:
  - Re-read `get <id>` every ~15 s, up to ~3 min.
  - Not moved → tell the user which event (push or PR action, branch), and point at the receiver's delivery log at
    https://hooks.lunabee.ovh/. Its reason line says why. Redeliver once fixed.
  - Never set a state or release a claim to fake the move.

- **Single writer.** Plane's own GitHub integration stays off.
  - `check-integration` → `github_integration` `off`, `on` or `unknown`.
  - A card moved with no hook behind it → tell the user to run that check; never move the card back by hand.

- **Not available:** moving a local backlog or a GitHub board to Plane (whackagent's `migrate` was removed in
  2.0.0). Asked for → say so.

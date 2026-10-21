# How the Plane board works

This page explains the pieces of the Plane board provider and how events flow between them. It describes how the system is built and why. For the setup steps, read [PLANE.md](../PLANE.md). For the rules every agent follows, read the project's `BOARD.md`.

In one sentence: **Plane holds the board, GitHub holds the code, and two writers move cards: agents through `wa-backlog`, and hooks running on a self-hosted runner.** Humans read the board, write tickets and reorder priorities in Plane. They never drag a card to another column.

## The pieces

```mermaid
flowchart LR
  subgraph People["People and agents"]
    H["Human<br/>(Plane UI)"]
    A["Agent<br/>(Claude Code, Codex, Cursor…)"]
    P["Backlog pane<br/>(Claude Code)"]
  end

  subgraph Self["Your own infrastructure"]
    PL[("Plane CE<br/>project WA<br/>states, order, cycles,<br/>modules, relations, links")]
    R["Self-hosted runner<br/>label WA_RUNNER_LABEL<br/>python3 + gh"]
  end

  subgraph GH["GitHub"]
    REPO[("Repository<br/>branches wa/WA-42-…<br/>task files, PRs<br/>claim refs refs/wa-claims/…<br/>variables WA_PLANE_*")]
    ACT["Actions<br/>caller whackagent-board-plane.yml<br/>→ board-plane.yml@hooks-v2"]
  end

  CLI["wa-backlog<br/>core + PlaneBoard"]

  H -- "reads, writes tickets,<br/>reorders" --> PL
  A -- "runs verbs" --> CLI
  P -- "wa-backlog list" --> CLI
  CLI -- "REST, X-API-Key" --> PL
  CLI -- "gh: refs, branches, PRs" --> REPO
  REPO -- "push / pull_request /<br/>schedule events" --> ACT
  ACT -- "job" --> R
  R -- "wa-backlog hook<br/>(vendored copy)" --> CLI
```

| Piece | What it is | Where it lives |
|---|---|---|
| **Plane CE** | The board: one project whose states are the six board states plus Canceled. Card order is priority, a cycle is a sprint, a module is a milestone, a relation is "blocked by", and a link points to the PR. | Your server. Free and open source. The per-key API limit must be lifted (`API_KEY_RATE_LIMIT=1000000/second`). |
| **`wa-backlog`** | One Python script (stdlib only). Its core handles the CLI, verbs, claims, PRs, merges and hooks. A `Board` interface sits on top, with one adapter per board tool: `GitHubBoard` and `PlaneBoard`. | `providers/wa-backlog` in the plugin. Each project vendors a copy at `.github/board/wa-backlog`. |
| **GitHub repository** | Code, ticket branches, task files (the spec), pull requests, and **claims** (atomic git refs). Settings live in repository variables. | GitHub, unchanged from the GitHub provider. |
| **Caller workflow** | A short file in the project that holds the triggers, permissions and concurrency. | `.github/workflows/whackagent-board.yml`, installed by `/wa-setup` from `providers/plane/whackagent-board-plane.yml`. |
| **Reusable workflow** | Checks out the default branch, then runs `wa-backlog hook` with the Plane key. | `rlatapy-luna/whackagent/.github/workflows/board-plane.yml@hooks-v2`. |
| **Self-hosted runner** | Runs the hook jobs next to Plane, so Plane stays on a private network and no Actions minutes are billed. | A machine you own that can reach `WA_PLANE_URL`. |
| **Backlog pane** | The board drawn beside the chat in Claude Code. | `hooks/` in the plugin. It reads `wa-backlog list`. |

## Who moves a card

The PRD's single-writer rule: every state change comes from an agent claim or from a hook, never from a human drag. Plane's own GitHub integration must stay off (`wa-backlog check-integration`).

```mermaid
stateDiagram-v2
  direction LR
  [*] --> Todo: agent creates (wa-backlog create)
  Todo --> Grilling: agent claims grilling
  Grilling --> Grilled: HOOK, task file with criteria pushed
  Todo --> Grilled: HOOK, task file pushed
  Grilled --> Coding: agent claims coding
  Coding --> Review: HOOK, PR opened or round pushed
  Review --> Coding: agent claims coding (feedback round)
  Review --> Done: HOOK, PR merged
  Review --> Grilled: HOOK, PR closed unmerged
  Grilling --> Grilled: agent releases --reset-to grilled
  Coding --> Review: agent releases --reset-to review
  Todo --> Canceled: agent cancels
  Grilled --> Canceled: agent cancels
  Done --> [*]
  Canceled --> [*]
```

- **Agents** only ever write `grilling` and `coding`, always through an atomic claim, plus `cancel`.
- **Hooks** write `grilled`, `review` and `done`, from what happened in the repository.
- **Humans** reorder cards. Order is priority, and agents pick from the top.

## A ticket's whole life

```mermaid
sequenceDiagram
  autonumber
  actor U as Human
  participant AG as Agent + wa-backlog
  participant GH as GitHub repo
  participant RUN as Runner (hook)
  participant PL as Plane

  U->>AG: /wa-task "login with Apple"
  AG->>PL: create card WA-42 in Todo (bottom)
  U->>PL: drags WA-42 to the top (priority)

  U->>AG: /wa-grill WA-42
  AG->>GH: create ref refs/wa-claims/WA-42/grilling
  AG->>PL: state Grilling, assign key user, 🔒 comment
  AG->>GH: push wa/WA-42-login-apple with task file + acceptance criteria
  GH-->>RUN: push event
  RUN->>GH: read task file at the pushed sha
  RUN->>PL: state Grilled, ✅ comment
  RUN->>GH: delete grilling claim ref
  AG->>PL: poll get WA-42 until Grilled (else report the run)

  U->>AG: /wa-code WA-42
  AG->>GH: claim coding (ref), blocked tickets refused
  AG->>PL: state Coding
  AG->>GH: push code, open draft PR (body links the card)
  GH-->>RUN: pull_request opened
  RUN->>PL: state Review, link PR on the card
  RUN->>GH: delete coding claim ref

  U->>AG: /wa-feedback, then /wa-validate
  AG->>GH: more rounds (claim coding → push → hook → Review), then PR ready
  U->>AG: /wa-close WA-42, "yes"
  AG->>GH: squash merge the PR
  GH-->>RUN: pull_request closed, merged
  RUN->>PL: state Done, run report comment
```

Two details matter:

- **The spec is the task file on the ticket branch**, not the card description. A spec written in the card description does not move the card to Grilled; the board check reports it as `spec-todo`. Plane webhooks can't reach a runner that only polls GitHub, so this is a v1 limitation.
- **The PR names its ticket** by its branch (`wa/WA-42-…`). If the branch has another name (for example a cloud agent's own branch), exactly one card link in the PR body names the ticket. With two card links, the hook moves nothing and says so on the PR.

## Claims: why they stay on GitHub

A claim is a git ref, `refs/wa-claims/<id>/<phase>`, created through the GitHub REST API. Git refuses to create a ref that already exists, so exactly one agent wins, whatever board tool sits behind it.

```mermaid
sequenceDiagram
  participant A1 as Agent 1
  participant A2 as Agent 2
  participant GH as GitHub refs API
  participant PL as Plane

  par both try at once
    A1->>GH: create refs/wa-claims/WA-42/coding
    A2->>GH: create refs/wa-claims/WA-42/coding
  end
  GH-->>A1: 201 created (winner)
  GH-->>A2: 422 already exists → exit 3, names the owner
  A1->>PL: state Coding, assign
  Note over A1,PL: If the Plane write fails, A1 deletes its ref again:<br/>no stray claim.
```

- `claims` lists live claims with owner, last activity and a stale flag (no push for `WA_STALE_AFTER_HOURS`, default 24).
- Releasing with `release --reset-to grilled|review` moves the card back and deletes the ref.
- Live test: six parallel claims on one card gave one winner and five exit 3, for both phases.

## The hook pipeline

```mermaid
flowchart TD
  E["GitHub event<br/>push to wa/** · pull_request · schedule · manual"] --> C["Caller workflow in the project<br/>triggers, permissions, concurrency"]
  C --> W["board-plane.yml@hooks-v2<br/>runs-on: vars.WA_RUNNER_LABEL"]
  W --> F{"Fork PR?"}
  F -- yes --> X["skipped: never reaches the runner"]
  F -- no --> K["checkout DEFAULT branch<br/>(.github/board + .whackagent only)"]
  K --> V{"WA_PLANE_URL, secret,<br/>vendored script present?"}
  V -- no --> FAIL["run fails with the fix"]
  V -- yes --> HK["python3 .github/board/wa-backlog hook"]
  HK --> D{"HOOKS[event]"}
  D -- push --> P1["ticket branch + task file with criteria<br/>→ Grilled, drop grilling claim"]
  D -- pull_request --> P2["opened / round pushed → Review<br/>merged → Done (+ sprint root)<br/>closed unmerged → Grilled<br/>always: link PR on card"]
  D -- "schedule / workflow_dispatch" --> P3["board check: report only<br/>one comment per problem, job summary"]
  D -- other --> P4["no-op, exit 0"]
```

Why it is built this way:

- **The script runs from the default branch, never from the pushed ref.** A ticket branch can't change the code that holds the Plane API key.
- **The hook logic is the project's vendored script.** Moving `hooks-v2` updates the workflow steps. A fix to the hook logic reaches a project only when `/wa-setup` refreshes `.github/board/wa-backlog`.
- **Settings come in whole.** The workflow passes `toJSON(vars)` as `WA_VARS`, because `GITHUB_TOKEN` can't list repository variables.
- **Every handler is idempotent.** Re-running a job (`gh run rerun`) changes nothing a second time, apart from one extra `✅ ready` comment.
- **Waiting skills never fake a move.** After a push they poll the card for about 3 minutes. If it hasn't moved, they report the run: failed (with its URL), queued (runner offline), in progress, or not triggered.

## The board check

On the schedule (weekdays 06:17 UTC) or on a manual run, the hook compares the board with the repository and only reports.

- **Problems it reports:**
  - a card in Coding or Grilling with no claim;
  - a stale claim;
  - a merged PR whose card is not Done;
  - a card in Review with no PR;
  - an open PR whose card is not in Review;
  - a Grilled card with no ticket branch;
  - criteria found in a Todo card's description.
- **One comment per problem on the card.** It is de-duplicated with Plane's `external_source`/`external_id` fields, and edited in place to `✅ resolved` once the problem is gone.
- **The job summary** lists every problem.
- **It never moves a card.**

## Moving an existing GitHub board to Plane

```mermaid
flowchart LR
  S["/wa-setup reconfigure<br/>Switch board to Plane"] --> CI["check-integration<br/>(Plane's GitHub integration off?)"]
  CI --> PR["provision<br/>states, labels, cycles + modules on,<br/>WA_PLANE_* variables"]
  PR --> DRY["migrate (dry run)<br/>plan only, writes nothing"]
  DRY --> REF{"ticket in grilling/coding/review,<br/>claim held or open PR?"}
  REF -- yes --> STOP["refused, exit 4,<br/>names each ticket"]
  REF -- no --> AP["migrate --apply<br/>cards in order, comments, sprints,<br/>modules, dependencies;<br/>issues closed not planned + wa-moved"]
  AP --> PU["migrate --apply --push<br/>(your yes): renamed branches<br/>wa/12-x → wa/WA-7-x"]
  PU --> SP["setup PR<br/>config plane, Plane caller,<br/>BOARD.md Plane section"]
```

- **Resumable:** every step checks what it leaves behind (external ids, refs, labels), so a rerun after a failure finishes without duplicates.
- **Not copied:** assignees, size, and done or canceled history. The GitHub Project stays untouched as an archive.

## Limits to know

- **Experimental:** the provider has not run on a real team project yet.
- **No size:** Plane CE v1.4.2 can't create estimates through its API.
- **Relations are add-only:** the API can't remove a "blocked by" relation, so remove it in the Plane UI.
- **Card-description specs don't count:** a spec written in the card description does not move the card. Use the task file.
- **One more machine to run:** a self-hosted runner is required infrastructure.

## Where to read more

- [PLANE.md](../PLANE.md): step-by-step setup and troubleshooting.
- [WORKFLOW.md](../WORKFLOW.md): cheat sheet with GitHub and Plane side by side.
- [providers/plane/README.md](../providers/plane/README.md): verified Plane API facts, settings, mapping, live test evidence.
- [providers/README.md](../providers/README.md): how to add another board tool.
- `templates/BOARD.md`: the board rules every agent follows (*This board: Plane*).

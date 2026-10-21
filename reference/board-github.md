## GitHub board

`backlog.provider: github`: tickets = issues on a GitHub Project. Code-host part (backlog script, `BOARD.md`, task file, claims, rounds, PRs): **reference/code-github.md**.

- **No `{backlog}` file, no local mirror.** Board = the Project. Never write order, state, size, sprint, title into any file.
- **Ticket id = issue number** (**reference/code-github.md**, *Ticket id*): `<id>` = `12`, `<#id>` = `#12`. Branch `wa/12-login-apple`, task file `{tasks}/12-login-apple.md`, claim ref `refs/wa-claims/12/coding`.
- **Spec in issue body** (another agent or human grilled it, **BOARD.md → This board: GitHub Project**, *Spec*) → ticket `grilled`, no branch, no task file. First whackagent round: branch via `gh issue develop <id> --name <branch.prefix><id>-<slug> --base <fork point>` (worktree per **reference/worktrees.md**), first commit = task file built from issue body (`## Context / Decisions`, `## Acceptance criteria` copied, source line `spec: issue <#id> body`, frontmatter per GitHub shape), message `task: spec <#id> <slug>` — ticket range start.
- **Development link** — ticket PR body carries `Closes <#id>`: hook adds **Development** link from it (or from branch name), any base: never link by hand, never set PR milestone (ticket carries it). `wa-backlog link-pr <id> <pr>` = repair only.
- **Sprint** — **BOARD.md → Sprints** (parent issue `wa-sprint`, tickets = sub-issues, sprint branch). `set-field <id> sprint <name>` creates parent on first use, reopens a closed one of same name; `""` detaches. Parent `get`/`claim` → exit 4. Ticket under non-sprint parent → exit 4: say so, never detach human's hierarchy. Hooks close parent when sprint lands (sprint branch PR merged; no sprint branch → last sub-issue landed). Progress from `list --sprint`. Split ticket → `split <id>` makes it root of own sprint, children its sub-issues (**wa-grill → GitHub provider**).
- **Milestone = GitHub milestone** — highest = version order of titles (`providers/CONTRACT.md` → *Milestones*). Humans create them on GitHub. Rules: **reference/milestones.md**.
- `list` lags new tickets 1–3 min (GitHub indexing); `get`/`claim` always current.

## Plane board

`backlog.provider: plane` — **experimental**. Tickets = work items of self-hosted Plane Community Edition project; code, branches, PRs, claims stay on GitHub (`vcs.provider: github`). Code-host part (backlog script, `BOARD.md`, task file, claims, rounds, PRs): **reference/code-github.md**.

- **No `{backlog}` file, no local mirror.** Board = Plane project. Never write order, state, title into any file.
- **Ticket id = work item key** (**reference/code-github.md**, *Ticket id*): `<id>` = `<#id>` = `WA-42` — project identifier + sequence number, as Plane UI shows it, never `#WA-42`. Branch `wa/WA-42-login-apple`, task file `{tasks}/WA-42-login-apple.md`, claim ref `refs/wa-claims/WA-42/coding`. Bare number (`42`) or other project's key → script exit 2: ask user for full key.
- **Spec in task file only.** Spec written in card description never moves ticket to `grilled` (no hook sees it) — grill writes task file on ticket branch as usual.
- **Priority = card order inside state column** (Plane `sort_order`, drag in UI). Humans reorder in Plane; `list` returns that order.
- **No size.** Plane CE can't create estimates over its API: `size` null in rows, `set-field size` exit 2, `create` drops `--size` with note. Never ask user for size here.
- **Canceled = Canceled column** (`not_planned: true`). Label `wa-ignore` = not a ticket (`get` exit 4).
- **Settings** — repo variables `WA_PLANE_URL`, `WA_PLANE_WORKSPACE`, `WA_PLANE_PROJECT_ID`, `WA_PLANE_STATES` (state ids), written by `provision`. API key: env `PLANE_API_KEY` for agents, Actions secret `WA_PLANE_API_KEY` for hooks — never in repo, config or chat. Script says `PLANE_API_KEY not set` → ask user to export it in their shell, stop.
- **Rate limit** — server must run `API_KEY_RATE_LIMIT=1000000/second` (Plane default 60/min per key). Script prints `Plane rate limit hit` → it retries alone; tell user to lift limit on server.
- **Not built yet** (experimental): claims and state writes, `move`, `comment`, `depend`, sprints, milestones (`milestones` → `[]`), hooks, `BOARD.md` Plane section. Verb exits 2 `not built yet on a Plane board` → say so, stop. Never work around it: no card moved by hand in Plane on agent's behalf.

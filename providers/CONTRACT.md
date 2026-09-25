# Backlog provider contract

Where tickets live and how their state moves. Skills speak **only** verbs below — never tracker terms (issue, card, column, GraphQL). New tracker (Jira, Linear, Trello, Notion) = new folder under `providers/` implementing same verbs, same states, same exit codes.

Config picks provider: `backlog.provider: local | github` in `.whackagent/config.md`. Missing → `local`.

| Provider | Implementation | Multi-agent |
|---|---|---|
| `local` | prompt-implemented, files — `providers/local.md` | no — one agent, one checkout |
| `github` | script `providers/github/wa-backlog` + board workflow — `providers/github/README.md` | yes — atomic claims, hooks drive state |

## States

Shared lifecycle, provider-neutral names. Provider maps them onto its own columns.

| State | Meaning | Entered by |
|---|---|---|
| `todo` | ticket exists, not grilled | creation (agent or human on tracker UI) |
| `grilling` | **locked** — one agent grilling it | agent `claim <id> grilling` |
| `grilled` | spec written, ready to code | **data**: ticket branch holds spec with acceptance criteria (hook) |
| `coding` | **locked** — one agent in code → feedback → validate → wiki loop | agent `claim <id> coding` |
| `ready-to-merge` | change proposed (PR open) | **data**: PR opened, or fix round pushed (hook) |
| `done` | change landed | **data**: PR merged (hook) |

Agents only ever write `grilling` / `coding` (through `claim`) and resets through `release`. Every other transition comes from repo events — agent never sets `grilled`, `ready-to-merge`, `done` itself. Code drives board, not agent's word.

Inside `coding`, whackagent sub-phase (`in-progress` → `review` → `validated`) lives in task file frontmatter `phase:` — coding lock guarantee single writer, board stay coarse.

## Verbs

All print JSON on stdout, messages on stderr.

| Verb | Does | Output / exit |
|---|---|---|
| `list [--state s,…] [--sprint x] [--all] [--owners]` | board rows, **priority order**, `done` hidden unless `--all` | `[{number,title,summary,state,size,sprint,claims,url}]`; draft rows `{draft:true,title}` |
| `get <id>` | one ticket + its branch | object, `branch` null before grilling pushed |
| `create --title --summary [--size] [--sprint] [--note]` | new ticket in `todo`, bottom of board | `{number,url,state}` |
| `claim <id> grilling\|coding [--agent a]` | **atomic lock**, then state → phase, trail comment | exit 0 won · **3 taken** (prints owner) · **4 wrong state** |
| `release <id> <phase> [--reset-to s] [--reason r]` | drop lock, optional state reset, trail comment | object |
| `set-state <id> <state>` | raw state write — setup/migration/manual repair only | object |
| `move <id> --top\|--bottom\|--before n\|--after n` | reprioritize | object |
| `set-field <id> size <quickwin\|medium\|large>` / `set-field <id> sprint <name\|"">` | fields; sprint created on first use | object |
| `comment <id> <text>` | human-facing trail | object |
| `claims` | every live lock: owner, since, branch, last activity, `stale` | array |
| `branch <id>` | remote branch carrying ticket | `{branch}` |
| `whoami [--agent a]` | agent id used for claims (`WA_AGENT` env, else `<host>:<worktree>`) | `{agent}` |

Exit codes: 0 ok · 1 error · 2 usage · 3 claim taken · 4 wrong state. Treat 3 and 4 as normal outcomes, not failures: pick next ticket or tell user.

## Claim rules

- `grilling` claimable from `todo`. `coding` claimable from `grilled` or `ready-to-merge` (fix round on open PR).
- Lost claim (exit 3) → never retry same ticket, never steal. Next ticket, or report owner to user.
- Lock released by data (hook) on next transition, or by `release` on explicit abort / stale cleanup — **human-triggered only**. No expiry: grilling interactive, human may answer in two days.
- `claims` flags `stale` past `stale_after` with no push on ticket branch. `/wa-board` shows them; `/wa-task release <id>` clears.

## Ticket ↔ repo contract

- Branch `<branch.prefix><id>-<slug>` (`wa/12-login-apple`). Grilling creates it, coding continues on it, PR opens from it.
- Spec file `{tasks}/<id>-<slug>.md` on that branch, frontmatter `issue: <id>`, non-empty `## Acceptance criteria`. That file = everything needed to start coding.
- Ticket title/summary/state/size/sprint live in tracker only — never duplicated in task file.

---
name: wa-autopilot
description: Auto mode — runs batch of tasks unattended, in parallel when they don't collide.
---

# /wa-autopilot

`/wa-code` unattended, over batch. Same PM role, same pipeline, one addition: **independent tasks run parallel, each in own git worktree.** Give batch, walk away, read report.

Wording (screen + reports): **wa-board → Voice** — telegraphic, tech terms stay English.

## Scope

Given tasks, or every `todo` task if none (confirm list first if user present). Best on small well-scoped tasks — say so if one look large or `grilled: false`.

**Args take slugs, display indexes or sprint name**, mixed, any order: `/wa-autopilot login-apple`, `/wa-autopilot 2,4,5`, `/wa-autopilot 2-5`, `/wa-autopilot 3 sync-offline`, `/wa-autopilot login-refacto`. Indexes = `#` from wa-board list — resolve per **wa-board → Task indexes**. Always **echo resolved list** (`2 → login-apple`). Bad index → stop, say which, no guess.

**Sprint name expands to its `todo` tasks**, backlog order — `in-progress`, `review`, `validated` already moving or waiting on user, don't touch. Resolve per **wa-board → Sprints**; echo expansion (`login-refacto → login-apple · login-layout · login-errors (3 todo, 2 already in review)`) so user see what left out. Sprint with no todo task → say so, stop. Sprint tasks usually touch same screen, so expect most land in **separate waves** — wave planner doing job, not failure.

## GitHub provider

`backlog.provider: github` (rules **wa-board → Backlog provider**). Several autopilots, on several machines, may run on one board at once — claims keep them apart.

- **Scope** = unclaimed `grilled` tickets, board order (`wa-backlog list --state grilled`); args = `#n`, indexes, or milestone name. Never `todo`: grilling needs user.
- **Claim each ticket before its worktree** — `wa-backlog claim <n> coding`. Exit 3 → drop from batch, echo `#12 skipped: coded by <agent>`. Claim just before wave starts, not whole batch up front: later waves' tickets stay free for others until needed.
- **Also check open PRs** before planning waves: `gh pr list --json number,headRefName,files` — ticket whose BRIEF files overlap files of open PR → warn in plan (`#14 touches LoginView like open PR #9 — merge conflict likely`). Warning, not block.
- **Worktree from existing ticket branch** (grilling pushed it) — fetch, then `git worktree add ../.wa-worktrees/<n>-<slug> <branch>`. Never `-b`: spec lives on that branch.
- **Delivery** — end of round per **wa-board → Backlog provider** (*Agent round*, *Draft PR*, *Hooks version gate*): commit (task file `phase: review` included), push, open **draft PR**, body line `Draft — autopilot delivery, verifier not run yet. …`. No confirm: unattended. Hook moves ticket to `review`, drops claim — nothing sits in `coding` overnight. Stacked base (another ticket's branch forked before upgrade) hits legacy hooks most. Print URL in report card header. Ready-for-review = `/wa-close`, after user validates.
- **Handoff** — nothing held after delivery: `/wa-feedback`, `/wa-validate`, `/wa-close` each claim from `review` for their own round, from any worktree or machine. Legacy hooks (`v < 6`) keep autopilot's claim → same host only.
- **Blocked ticket** → `wa-backlog release <n> coding --reset-to grilled --reason "BLOCKED: <question>"` — question lands on issue, ticket free for next attempt once answered.

## 1. Plan the batch — what can run at once

Do `/wa-code` step 1 (**Plan**) for **every** task in batch, up front, main thread. Now hold one BRIEF per task — that tell you if two tasks share clock.

**GitHub provider:** `wa-backlog get <n>` → `blocked_by` with open blocker → ticket waits for that blocker's wave (or skip it: blocker not in batch and not landed = forks off code that isn't there).

**Stacking** — blocker in same batch, not landed: its wave delivers first, then dependent ticket **stacks on it**: worktree from ticket's own branch, `git rebase --onto origin/<blocker branch> $start^` (ticket range, **wa-board → Backlog provider**), `push --force-with-lease`, draft PR base = blocker branch. Only when blocker branch carries hooks v3+ (check above) — else no draft. One open blocker per stacked ticket: two unlanded blockers on different branches → can't stack, ticket waits for next run. Ask user max stack depth before planning (recommend 2: every feedback round on bottom ticket cascades one rebase per layer). Echo stack in plan: `wave 2 (∥): #17 · #20 · #26   ← stacked on #16`.

**Two tasks independent when all hold:**
- `FILES` + `LAYOUT` sets don't intersect — no shared file, no shared target folder;
- neither's `REUSE` names something other creates;
- different features/modules (`BOUNDARIES` don't overlap).

Any doubt → **sequential**. Merge conflict at 3am cost more than wall-clock saved.

Group batch into **waves**: everything in wave runs parallel, waves run one after another. **Cap wave at 3** — beyond that, builds queue on machine anyway and report get unreadable.

Echo plan before start:

```
wave 1 (∥): login-apple · export-csv
wave 2     : sync-offline   (touches AuthStore, like login-apple)
```

## 2. Run a wave — one worktree per task

Each task get own checkout, so parallel implementers never see each other's edits.

1. **Create worktree**, always branching whatever `branch.per_task` says. Fork point per `/wa-code` step 0: `branch.base`, **or sprint branch** when task carry `sprint:` and `branch.sprint_prefix` non-empty — create `<branch.sprint_prefix><sprint>` from `branch.base` once, before wave, then fork every task of that sprint off it.
   ```
   git worktree add ../.wa-worktrees/<slug> -b <branch.prefix><slug> <fork point>
   ```
   **Sprint branch is created in the main checkout, never inside a worktree**, and only once per sprint per run — two waves of the same sprint share it. Tasks of one sprint in the *same* wave still fork off the sprint branch as it stood at wave start: they run in parallel, so none see each other. That's the wave planner's job to have made safe.
2. **Spawn one `wa-implementer` per task in the wave, in a single message** so they actually run concurrently. Each gets the standard `/wa-code` step 2 payload **plus its worktree path**, and the instruction: *work only under `<worktree>`, absolute paths, never touch the main checkout or another worktree.*
3. **No verifier here** — `review.when: on_validation` holds, and unattended is exactly where it holds hardest: the user's review is **async**, so a task that gets reworked tomorrow morning would have been reviewed tonight for nothing. Autopilot delivers *code*, built and run; the verifier runs later, when the user runs **`/wa-validate <slug>`** on the branch. `review.when: each_round` → then yes, one per task per `/wa-code` step 3 (diff hunks from that worktree only; verifiers are read-only, so they parallelize freely across tasks).
4. **Keep every agent alive** — `agentId` per role **per task**. Autopilot is where this pays most: a batch of 5 tasks × 3 rounds is 15 spawns if you forget, 5 if you don't.

**The runtime check is on by default here** — `verify.mode: autopilot` (the default) means the implementer exercises what it just built — app, web page, service or CLI. Nobody is at the keyboard to catch a green build that doesn't work, so unattended is exactly where that proof is worth its cost. Only `verify.mode: off` skips it; `always` behaves the same as here. Non-runnable project (library, `verify.platform: none`, no device, no MCP server) → build + tests are the proof, say so in the report rather than claiming a check nobody ran.

**One device, one queue.** Builds run fine in parallel (separate worktrees, separate build dirs), but the **runtime check does not** — one simulator/emulator, one browser session, one local port. Serialize it: implementers in a wave build concurrently, then run their checks one at a time. Server/CLI checks that bind nothing shared may overlap. Tell each implementer to hold its runtime check until you say go, or accept that a wave's runtime checks are sequential tail work.

## 3. Close each task

1. **Commit in its worktree**, on its branch, with the configured author name/email. **Never as Claude. Never merge to base. Never touch another branch.** The commit is the delivery, not a close: the code is unreviewed by the verifier and unseen by the user, sitting on a branch nobody merged.
2. **`status: review`** + notes — never `done`, never `validated`. A task leaves autopilot waiting for the user to test it, exactly like one from `/wa-code`. **Never merge into the sprint branch here** — that's `/wa-close`, after the user's review; an unreviewed merge poisons the base of every later task in the sprint. **Don't** sync wiki/graph unattended — `/wa-close` does it when task closes.
3. **Remove the worktree** (`git worktree remove ../.wa-worktrees/<slug>`) — the branch survives, that's what you review later. A blocked task keeps its worktree; say so in the report.

Skip the report-and-iterate phase entirely — nobody's there to iterate with. Save the report to `{reports}/<slug>.md` (`{…}` from the config's `paths:` block, see **wa-board → Paths**) — **in the main checkout, never inside a worktree**: the worktree gets removed and the report with it.

## Blockers — skip and log, never ask, never guess

The "stop and ask" rule is inverted here: nobody is watching. A `BLOCKED:` from the implementer, a failed runtime check, or any ambiguity →

- set the task `status: todo` with a `blocked` note, write the open question into the task file;
- **move to the next task.** Never guess scope, never invent a feature, never commit an unverified one as done.

A blocker in one task **does not** stall its wave — the others keep going.

## Final report

Print and save `{reports}/autopilot-<date>.md`:

```
# Autopilot · 2026-09-18 · 🏁 login-refacto 2/3

2 · 🟢 **Login Apple** — to test
3 · 🟡 **Login layout** — to test
5 · 🟢 **Forgot password** — ⛔ blocked

---
## 🟢 Login Apple · branch wa/login-apple
<report card>

## 🟡 Login layout · branch wa/login-layout
<report card>

---
## ⛔ Forgot password
Question: reset by email or magic link?
Rec: magic link, already in place for signup.

→ next: /wa-validate login-apple
```

Three parts, always this order:

1. **Recap** — every task of the batch, **wa-board list format** (line 1 only), suffix `— to test` or `— ⛔ blocked`. Sprint in play → progress line in title; several sprints → group recap by sprint.
2. **One card per delivered task** — **wa-code → Report card**, branch in header instead of sprint tag. Same skeleton as attended `/wa-code`.
3. **Blocked** — per task: open question + your recommended answer, one line each. Kept worktree → say so.

One branch per task still, never one per sprint: user reviews and merges task by task. Never write `review: clean` for a task the verifier never saw.

## Next step

Test the delivered branches. Notes on one → **`/wa-feedback <slug> <notes>`** (checks it out, applies them through the same pipeline). Matches spec → **`/wa-validate <slug>`** (verifier on the whole branch), then **`/wa-close <slug>`** after your retest — it syncs the wiki, then merges into the sprint branch or lands per `close.strategy`.
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

- **Scope** = unclaimed `grilled` tickets, board order (`wa-backlog list --state grilled`); args = `#n`, indexes, or milestone name. Never `todo`: grilling needs user — except **AFK mode** (below).
- **Claim each ticket before its worktree** — `wa-backlog claim <n> coding`. Exit 3 → drop from batch, echo `#12 skipped: coded by <agent>`. Claim just before wave starts, not whole batch up front: later waves' tickets stay free for others until needed.
- **Also check open PRs** before planning waves: `gh pr list --json number,headRefName,files` — ticket whose BRIEF files overlap files of open PR → warn in plan (`#14 touches LoginView like open PR #9 — merge conflict likely`). Warning, not block.
- **Worktree from existing ticket branch** (grilling pushed it) — fetch, then `git worktree add ../.wa-worktrees/<n>-<slug> <branch>`. Never `-b`: spec lives on that branch.
- **Delivery** — end of round per **wa-board → Backlog provider** (*Agent round*, *Draft PR*, *Hooks version gate*): commit (task file `phase: validated` + `## Review` included — `phase: review` when findings stay open, see step 3), push, open **draft PR**, then `wa-backlog link-pr <n> <pr>`. Body line `Draft — autopilot delivery, verifier clean. Test, then /wa-close · /wa-feedback.` (findings open → `Draft — autopilot delivery, verifier findings open. Test, then /wa-feedback · /wa-validate.`). No confirm: unattended. Hook moves ticket to `review`, drops claim — nothing sits in `coding` overnight. Stacked base (another ticket's branch forked before upgrade) hits legacy hooks most. Print URL in report card header. Ready-for-review = `/wa-close`, after user tests.
- **Handoff** — nothing held after delivery: `/wa-feedback`, `/wa-validate`, `/wa-close` each claim from `review` for their own round, from any worktree or machine. Legacy hooks (`v < 6`) keep autopilot's claim → same host only.
- **Blocked ticket** → `wa-backlog release <n> coding --reset-to grilled --reason "BLOCKED: <question>"` — question lands on issue, ticket free for next attempt once answered.

## AFK mode — whole backlog, nobody back before the end

Arg says so (`afk`, `full afk`, "run the whole backlog"). Same pipeline, three limits lifted:

- **Stack depth unlimited.** Every ticket with an unlanded blocker stacks; never "waits for next run".
- **Multi-blocker → linearize.** Stack on the blocker branch that already contains every other open blocker (`git merge-base --is-ancestor`). None does → make one: the blocker not yet delivered stacks on the other at its own delivery (rebase its ticket range onto it, PR base = it). Result is mostly **one chain** — merge order forced bottom-up; say it in plan. Parallel only for leaves nothing later depends on, forked off chain tip; every wave rule above still holds.
- **Grill `todo` tickets unattended.** `/wa-task` GitHub steps 2–5 (claim `grilling`, `gh issue develop`, spec, push), you answering each grill question with your own recommendation — read code + wiki first, YAGNI, most reversible option. Every such answer lands in `## Context / Decisions` tagged `(autopilot assumption)`, listed again in report card **To test** so user confirms or corrects. Grill needs product intent code can't give → don't guess: release `--reset-to todo --reason "BLOCKED: <question>"`, ticket stays out. Dependencies found → `wa-backlog depend`, then ticket enters plan like any `grilled` one.

Plan echo shows chain + leaves: `chain: #23 → #18 → #19 → #22 → #24 …` · `leaf ∥: #25 on #24`.

## 1. Plan the batch — what can run at once

Do `/wa-code` step 1 (**Plan**) for **every** task in batch, up front, main thread. Now hold one BRIEF per task — that tell you if two tasks share clock.

**GitHub provider:** `wa-backlog get <n>` → `blocked_by` with open blocker → ticket waits for that blocker's wave (or skip it: blocker not in batch and not landed = forks off code that isn't there).

**Stacking** — blocker in same batch, not landed: its wave delivers first, then dependent ticket **stacks on it**: worktree from ticket's own branch, `git rebase --onto origin/<blocker branch> $start^` (ticket range, **wa-board → Backlog provider**), `push --force-with-lease`, draft PR base = blocker branch. Only when blocker branch carries hooks v3+ (check above) — else no draft. One open blocker per stacked ticket: two unlanded blockers on different branches → can't stack, ticket waits for next run. Ask user max stack depth before planning (recommend 2: every feedback round on bottom ticket cascades one rebase per layer) — AFK mode: no limit, no question. Echo stack in plan: `wave 2 (∥): #17 · #20 · #26   ← stacked on #16`.

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
3. **Validate each task — autopilot runs `/wa-validate` itself.** Implementer receipt `done` + runtime check green (or build + tests on non-runnable project) → run **`/wa-validate` steps 3–7** for that task, unattended. The runtime check stands in for the user's green light: nobody there to give it, and the user asked autopilot to deliver reviewed code, not code waiting for a verifier.
   - **One `wa-verifier` per task**, per `/wa-code` step 3 in full. Scope = ticket range (GitHub provider) or `branch.base..HEAD` of that worktree — hunks from that worktree only. Diff too big to inline → write it to a patch file in scratchpad, hand the path, tell it to read in ranges.
   - Verifiers are read-only → **parallelize freely** across tasks of the wave, no device queue.
   - `LENSES:` short of four ✓ → send back for missing lens before anything else.
   - **Autofix** (`review.autofix: true`) → `SendMessage` same task's implementer the findings, re-verify, cap 3 rounds. Autofix touched code → implementer re-drives runtime check (`verify.mode` not `off`), device queue again.
   - Clean → `phase:`/`status: validated`, `## Review` round `validation (autopilot)` with lenses + what autofix changed.
   - **Findings still open after cap** (or not converging) → not a blocker: deliver at `review`, open findings in `## Review` + report card with recommendation per item. User decides: `/wa-feedback` or `/wa-validate`.
   - `review.when` does not gate this — autopilot always validates.
4. **Keep every agent alive** — `agentId` per role **per task**. Autopilot is where this pays most: a batch of 5 tasks × 3 rounds is 15 spawns if you forget, 5 if you don't.

**The runtime check is on by default here** — `verify.mode: autopilot` (the default) means the implementer exercises what it just built — app, web page, service or CLI. Nobody is at the keyboard to catch a green build that doesn't work, so unattended is exactly where that proof is worth its cost. Only `verify.mode: off` skips it; `always` behaves the same as here. Non-runnable project (library, `verify.platform: none`, no device, no MCP server) → build + tests are the proof, say so in the report rather than claiming a check nobody ran.

**One device, one queue.** Builds run fine in parallel (separate worktrees, separate build dirs), but the **runtime check does not** — one simulator/emulator, one browser session, one local port. Serialize it: implementers in a wave build concurrently, then run their checks one at a time. Server/CLI checks that bind nothing shared may overlap. Tell each implementer to hold its runtime check until you say go, or accept that a wave's runtime checks are sequential tail work.

## 3. Close each task

1. **Commit in its worktree**, on its branch, with the configured author name/email. **Never as Claude. Never merge to base. Never touch another branch.** The commit is the delivery, not a close: code reviewed by the verifier but unseen by the user, sitting on a branch nobody merged.
2. **`status: validated`** (verifier clean) or **`review`** (findings open) + notes — never `done`. A task leaves autopilot waiting for the user to test it; clean one needs only their retest + `/wa-close`. **Never merge into the sprint branch here** — that's `/wa-close`, after the user tests; an unreviewed merge poisons the base of every later task in the sprint. **Don't** sync wiki/graph unattended — `/wa-close` does it when task closes.
3. **Remove the worktree** (`git worktree remove ../.wa-worktrees/<slug>`) — the branch survives, that's what the user tests later. A blocked task keeps its worktree; say so in the report.

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

2 · 🟢 **Login Apple** — to test · review clean
3 · 🟡 **Login layout** — to test · 2 findings open
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

→ next: test login-apple, then /wa-close login-apple
```

Three parts, always this order:

1. **Recap** — every task of the batch, **wa-board list format** (line 1 only), suffix `— to test · review clean`, `— to test · <n> findings open` or `— ⛔ blocked`. Sprint in play → progress line in title; several sprints → group recap by sprint.
2. **One card per delivered task** — **wa-code → Report card**, branch in header instead of sprint tag. Same skeleton as attended `/wa-code`.
3. **Blocked** — per task: open question + your recommended answer, one line each. Kept worktree → say so.

One branch per task still, never one per sprint: user reviews and merges task by task. Never write `review: clean` for a task the verifier never saw or with findings open.

## Next step

Test the delivered branches — already reviewed by the verifier. Notes on one → **`/wa-feedback <slug> <notes>`** (checks it out, applies them through the same pipeline; task back to `review`, needs `/wa-validate` again). Matches spec → **`/wa-close <slug>`** — it syncs the wiki, then merges into the sprint branch or lands per `close.strategy`. Delivered with findings open → `/wa-feedback` or `/wa-validate` first.
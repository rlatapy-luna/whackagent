---
name: wa-validate
description: Your green light on coded feature — "this is what I asked for". Runs verifier over whole diff (style, elegance, structure, correctness) and records verdict. Does NOT close task — /wa-close does.
---

# /wa-validate

**Your green light on spec, not code.** You tested feature, does what spec says. That statement unlock verification pass: verifier judge *how* written, over whole diff, once.

Wording (screen + reports): **wa-board → Voice** — telegraphic, tech terms stay English.

Does **not** set task `done`, never touch git. You probably retest after review touch things — closing separate deliberate step: **`/wa-close`**.

Where it sit: `/wa-task` → `/wa-grill` → `/wa-code` → *you test, `/wa-feedback`, you test again* → **`/wa-validate`** → verifier → *you retest* → **`/wa-close`**.

## Why it's a command and not a step

Review every round burn one verifier per note, review code about to change anyway. Review before you said "yes, that's feature" review wrong feature well. So review wait for exactly one signal — yours — then run once, over everything.

## Do

1. **Resolve task.** Slug or display index, per **wa-board → Task indexes**; echo what you resolved. No arg → most recent `review`. Read `.whackagent/config.md` + task file at `{tasks}/<slug>.md` — `{…}` paths from config's `paths:` block, see **wa-board → Paths**.
   - `status: in-progress` → code not finished. Say so, don't review half-task.
   - `status: validated` → already reviewed. Code moved since → re-review delta; untouched → nothing to do, closing is **`/wa-close <slug>`**.
   - `status: done` / `canceled` → nothing to do.
2. **Be on right branch.** `branch.per_task` or `/wa-autopilot` delivery → work live on `<branch.prefix><slug>`. Not here → say which branch, switch **only after user confirms** (their tree may be dirty). `branch.worktree: true` → no switch: review in task worktree, recreated from branch if gone (**wa-board → Worktrees**).
3. **State what you take as validated** — the `## Acceptance criteria`, listed back in one block. Criterion they know unmet means they wanted `/wa-feedback`, not this: say so and stop rather than review feature still being finished.
4. **Run project tools** — `tools` entries whose `when` holds `validation`, each `run` as given, whole project, here in main thread (verifier read-only). Failures in diff files → `tool:<name>` findings, severity `major`. Failures in files diff never touched → pre-existing: one line in report, never findings, never fixed. No such entry → skip, echo nothing.
5. **Dispatch verifier** — point of command. One `wa-verifier`, per `/wa-code` step 3 in full.
   - **Scope = cumulative diff**: `branch.base..HEAD` plus working tree when task has own branch, else every file in `## Implementation` and each `## Feedback` round. Hunks inline, `inline`-tagged ones **flagged as written without convention pass** — those get harder look.
   - Hand it step 4 tool findings, so it don't re-report them.
   - Resume run's verifier by `agentId` when id still live (hunks + anti-stale warning); fresh spawn otherwise.
6. **Check sweep → autofix.** `LENSES:` short of four ✓ → send back for missing lens first; this pass close task, lens skipped here skipped for good. Then merge tool findings, order by severity, keep lens and `tool:` tags. `review.autofix: true` → dispatch implementer (tool findings carry their `run` + `fix` commands: it try `fix` first, never you — fixer edits code), re-run failing tools + re-verify, loop until clean or no progress, **cap 3 rounds**. Not converging → stop, show what left. Record everything in `## Review` under `validation` round.
7. **Runtime.** `verify.mode: always` and autofix touched code → implementer re-drive app. Any other mode → **say plainly code moved since user tested it** and name files, so nobody treat stale test as proof.
8. **Set `status: validated`** (reflect in `{backlog}`). Never `done` here — that's user's second look, not yours.
9. **Refresh `{reports}/<slug>.md`** (main checkout, never worktree) — append `validation` round: tool + verifier findings, what autofix changed, status line `review ✅ clean` or open findings. Report predating this pass otherwise still show unreviewed code.
10. **Report + hand back**, one of three:
   - **Clean, autofix changed nothing** → code they tested *is* code reviewed. Nothing to retest: *"`/wa-close <slug>` whenever you want."*
   - **Clean, autofix changed code** → list what changed, in their terms. *"Retest, then `/wa-close <slug>`."*
   - **Findings still open** → show severity-ordered, with recommendation per item (fix now / accept and close / spin off `/wa-task`). Don't hand off to `/wa-close` with findings open — say which ones you'd accept.

## GitHub provider

`backlog.provider: github`: task file `phase:` plays `status:` (`review` → `validated`). Resolve `#n` / index. One **agent round** (**wa-board → Backlog provider**): `claim <n> coding` from `review` first (exit 3 → someone mid-round, say who, stop; legacy hooks: same-host holder counts as yours), verify + autofix, then commit task file (`phase: validated`, `## Review`) + autofix code, push to draft PR, then **refresh PR body** (**wa-board → Backlog provider**, *PR body refresh*) — checklist from final `## Verification`, status line `Draft — validated, verifier clean. Retest, then /wa-close.` (findings left open → name them). Hook sets `review`, drops claim — ticket waits for your retest in `review`, not `coding`. `validated` stays whackagent-internal (task file), board never shows it. **Scope = ticket range** (`git diff $start^` + working tree, **wa-board → Backlog provider**), not `branch.base..HEAD`: squash-merged parent or stack makes that diff drag in already-landed code.

## Interaction with the rest

- **`/wa-feedback` on `validated` task** → code moved after its review: status go back to `review`, task need `/wa-validate` again. Never close on review predating last edit.
- **`review.when: each_round`** → rounds already reviewed; this pass still run, over cumulative diff, and it's one that counts. Short: most findings already fixed.
- **`/wa-autopilot`** runs this command's steps 3–8 itself, unattended, its runtime check standing in for your green light — tasks arrive `validated` (clean) or `review` (findings open). Clean → nothing to do here unless code moved; `/wa-close` after your test.

## Never

- Never mark task `done` — that's `/wa-close`, after user retests reviewed code.
- Never review task user hasn't validated: without their yes, you review feature still moving. Only exception: `/wa-autopilot`, where its green runtime check is the yes.
- Never commit, merge, push, open PR or delete branch — **git belong to `/wa-close`**. GitHub provider exception: round-end commit + push to existing draft PR (above) — never merge, never mark ready.
- Never write code yourself — findings go to implementer, same as `/wa-code`.

## Asking

Every question carry recommended answer + one-line reason — finding worth accepting, branch worth switching, fix worth spinning off. Never bare question.

## Next step

Retest what review changed, then **`/wa-close <slug>`** — it commit, land branch (merge into sprint, PR, or nothing per `close.strategy`) and mark task `done`, wiki synced in same commit.
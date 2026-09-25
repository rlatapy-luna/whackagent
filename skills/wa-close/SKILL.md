---
name: wa-close
description: Close validated task — record done, commit, land branch (sprint merge, PR, or nothing per config), clean branch and worktree. Last step of task lifecycle.
---

# /wa-close

**Task finished.** You retested reviewed code, still does what you asked. `/wa-close` write that down, put branch where belong.

Wording (screen + reports): **wa-board → Voice** — telegraphic, tech terms stay English.

Where sit: `/wa-task` → `/wa-code` → *you test, `/wa-feedback`* → `/wa-validate` (verifier) → *you retest* → **`/wa-close`**.

`/wa-validate` = **review** door — judge code, set `validated`. `/wa-close` = **landing** door — end task, move branch. Two commands, two questions. Second one touch git in ways you want see coming.

## Do

1. **Resolve task.** Slug or display index, per **wa-board → Task indexes**; echo what resolved. No arg → most recent `validated`. Read `.whackagent/config.md` + `{tasks}/<slug>.md` — `{…}` paths per **wa-board → Paths**.
   - `status: validated` → normal path, continue.
   - `status: review` → **never reviewed.** Say so, send to `/wa-validate <slug>`, stop. Closing here close unreviewed code.
   - `status: in-progress` → not coded. Stop.
   - `status: done` / `canceled` → already closed. Say what branch did, stop.
2. **Check nothing moved** since review round — `git diff` against state `## Review` recorded. Code changed → say what, send back to `/wa-validate` for delta. Review only worth tree it read.
2b. **Sync wiki — always, before plan.** Run **`/wa-wiki`** update mode scoped to this task (its diff + task file, `wiki:` pages it flagged), on task branch. Wiki pages edited → listed in plan block, committed **with task** in step 4 (one commit, one PR — wiki never lands separately or later). Nothing to update → say `wiki: nothing to sync`. Wiki edits don't count as "code moved" for step 2: docs, not reviewed code.
3. **Show landing plan, get yes.** One block, before touching git — see *Plan block*. Only confirmation command ask; everything after run without more prompting.
4. **Commit** — when `commit.auto_commit_after_validation`. `commit.author_name` / `commit.author_email` (empty → repo's git identity), **never as Claude**. Already clean → skip, say so.
   - Nothing committed and tree dirty → **stop before any branch move.** Uncommitted work plus merge = how work disappear.
5. **Land branch** — *Landing* below. Task in sprint → merge into sprint branch. Else → `close.strategy`.
6. **Clean up** — *Cleanup* below. Worktree then branch, that order, `close.delete_branch` decide.
7. **`status: done`**, reflect in `{backlog}` (move line under **Done**, keep `· <sprint>` suffix).
8. **Sprint complete?** Last task of sprint just closed → *Sprint landing*.
9. **Next branch** — when `branch.per_task` **and** `commit.auto_commit_after_validation` **and** `branch.checkout_next`: next task = top `todo` in `{backlog}` order, branch created/checked out per `/wa-code` step 0 (its sprint decide base — dirty tree → ask). Echo `✅ <slug> closed → branch wa/<next-slug> ready · /wa-code <next-slug>`.
10. **Report** — after-state, four lines max: what landed where, what deleted, sprint progress, next command.

## GitHub provider

`backlog.provider: github` (rules **wa-board → Backlog provider**). End of `coding` = PR opened; board moves itself. Replaces steps 5–9:

1. **Resolve** `#12` / `12` / index. Check coding claim held from this host (`wa-backlog get <n>` → `claims[].agent` host part = `wa-backlog whoami` host part — autopilot worktree on same machine counts). Other host / none → stop: closing someone else's work, or work nobody claimed. `phase:` in task file plays role of `status:` in step 1.
2. **Wiki + commit** (steps 2b + 4) — always on ticket branch, task file included (`phase: validated`, Review/Verification filled) and wiki pages step 2b touched: they ride in ticket PR.
3. **Rebase onto PR base** — `sprint/<milestone>` when ticket has milestone, else `close.target`. Fetch first. Replay **ticket range only**: `git rebase --onto <base> $start^` (**wa-board → Backlog provider**, squash merge) — plain `git rebase <base>` replays squashed parents' commits and conflicts on every one. Stacked PR whose parent just landed: GitHub retargets it to parent's base once parent branch deleted; check `gh pr view --json baseRefName`, else `gh pr edit --base <base>`. PR base still another ticket's open branch (parent not landed) → **stop**: close parent first — rebasing ticket range onto sprint now drops parent's code. Conflicts mechanical (wiki index lines, import lists, generated files) → resolve yourself; touching logic → stop and ask with recommended resolution. Then **re-run build + tests**; red → stop, back to `/wa-feedback`.
4. **Push + PR** — `git push --force-with-lease` (rebased), then `gh pr create --base <base> --head <branch> --title "<ticket title>" --body` = summary + `Closes #<n>` + acceptance criteria checklist. **Existing draft PR** for branch (autopilot delivery) → push, refresh body (`gh pr edit`), then `gh pr ready <pr>` — hook sees `ready_for_review`. **Existing open non-draft PR** (fix round) → push only, no new PR. Plan block names PR base and says it pushes; always confirmed, every time.
5. **Board** — hook sets `ready-to-merge` and releases coding claim. Confirm `wa-backlog get <n>` (re-read once after ~30 s). Never set state yourself.
6. **Branch + worktree kept** — PR needs branch. Autopilot worktree: remove only when clean.
7. **`done` is not yours** — merge on GitHub (human, or project's merge policy) → hook sets `done`, closes issue, closes milestone when empty.
8. **Next** (`branch.checkout_next`) → next ticket only through **claim**: `/wa-code` without arg picks top unclaimed `grilled`. Never check out ticket branch you don't hold.

Sprint landing (below) unchanged: last ticket of milestone merged into `sprint/<name>` → propose sprint PR onto `close.target`.

## Plan block

Say what you about to do to git **before** doing it, in their terms. Landing outward-facing, half irreversible:

```
Closing login-apple

wiki      : [[auth]] updated, [[login-apple]] created (/wa-wiki)
commit    : 2 uncommitted files + 2 wiki pages → commit (Benjamin Pisano)
sprint    : merge wa/login-apple → sprint/login-refacto
branch    : wa/login-apple deleted (merged)
worktree  : ../.wa-worktrees/login-apple removed
after     : 🏁 login-refacto — 3/5

ok? [y/n]
```

Rules:

- **Always shown, always confirmed.** `strategy: nothing` and no commit → two lines and a yes, still worth it.
- **`strategy: pr` = loud case.** PR visible to other people second it opens. Name target branch, title you use, and that it push. Never open one on implied yes carried from earlier close.
- Anything you skip (no commit, no worktree, branch kept) → say it skipped, not omit line. Silence read as "it happened".
- User say no → stop at step 3. Task stay `validated`, nothing touched.

## Landing

**Task in sprint** (`sprint:` set, `branch.sprint_prefix` non-empty):

1. Sprint branch = `<branch.sprint_prefix><sprint>` (default `sprint/login-refacto`). Absent → create from `branch.base`; happen when task coded before sprints existed.
2. Merge task branch into it. **Not rebase, not squash** — sprint branch is working branch, history yours to rewrite later if want.
3. **Conflict → stop, leave merge in progress**, name files, say task stay `validated` until resolved. Never `--abort` behind their back, never guess resolution: conflict between two tasks of one sprint = real design question.
4. Task branch landed → `delete_branch: auto` delete it.

**Standalone task** (no sprint, or `sprint_prefix` empty) → `close.strategy`:

- **`nothing`** (default) — stop after commit. Branch stay exactly where it is. Say plainly (`branch wa/login-apple kept — PR is yours`) so nobody wait on PR that not coming.
- **`pr`** — push branch, then `gh pr create --base <close.target>`. Title = task title, body = task `summary` plus its `## Acceptance criteria`. Print URL. `gh` missing or unauthenticated → say so, fall back to `nothing`, leave branch pushed. **Never delete branch with open PR**, whatever `delete_branch` say.
- **`merge`** — merge into `close.target` locally, **no push**. Target checked out elsewhere or dirty → say so, stop. Conflict → same rule as sprint merge: leave it, name files.

**`branch.per_task: false`** — task coded on whatever branch you were on. Nothing to land, nothing to delete: commit, mark done, say so. Skip *Landing* and *Cleanup* whole.

## Cleanup

Order matter — worktree holding branch block deleting it.

1. **Worktree** — `../.wa-worktrees/<slug>` (autopilot leftover) → `git worktree remove`. Dirty → **stop and ask**; uncommitted work in worktree still work.
2. **Branch** — `close.delete_branch`:
   - `auto` (default) → delete only when code live somewhere else: merged into sprint branch, or merged into `close.target`. `pr` and `nothing` keep branch.
   - `always` → delete. **Unmerged → ask first**, say what would be lost.
   - `never` → keep, say so.
3. **Local only.** Never delete remote branch, never `push --delete`, unless asked in that message.

## Sprint landing

Last task of sprint reach `done` — no task of that sprint left in `todo`, `in-progress`, `review` or `validated`:

1. Say it: `🏁 login-refacto — 5/5, last task closed.`
2. **Propose** applying `close.strategy` to sprint branch, onto `close.target` — same three behaviours as standalone task, recommendation first:
   ```
   → Recommended: PR sprint/login-refacto → main   (close.strategy: pr)
     Otherwise: keep the branch, you ship it yourself.
   ```
3. **Only on yes.** No is a normal answer — the branch stays, the sprint stays complete, nothing is lost. Never fold this into the task's own confirmation at step 3: two different things landing, two yeses.
4. Sprint branch merged or PR'd → `delete_branch` applies to it the same way it applies to a task branch.

A sprint is never `done` as a thing — there's no sprint status to set. It's complete when its tasks are, and this step is the only place that notices.

## Interaction with the rest

- **`/wa-validate`** sets `validated` and stops there. It never commits, never touches a branch, never sets `done`.
- **`/wa-feedback` on a `validated` task** → status back to `review`, needs `/wa-validate` again before it can be closed.
- **`/wa-autopilot`** leaves tasks at `review` on their own branches, worktrees already removed (except blocked ones). Each still goes `/wa-validate` → `/wa-close`.
- **`/wa-wiki`** runs **inside** `/wa-close` (step 2b), never after: wiki lands in same commit/PR as code it describes. Standalone `/wa-wiki` stays for syncs outside a task (query mode, catch-up).

## Never

- Never close a task the verifier never saw (`review` → `/wa-validate` first).
- Never merge, push, open a PR or delete a branch without the confirmed plan block.
- Never force-push, never rewrite a shared branch, never touch a branch that isn't this task's or its sprint's.
- Never delete a branch whose work isn't somewhere else.
- Never commit as Claude.
- Never write to a literal `.whackagent/` path when the config's `paths:` points elsewhere.

## Asking

Every question carries your recommended answer plus a one-line reason — conflict resolution, unmerged branch, missing `gh`. Never a bare question.

## Next step

`/wa-board` for what's next — wiki already synced by step 2b.
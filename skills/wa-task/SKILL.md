---
name: wa-task
description: Turn fuzzy idea into clear grilled task, then re-prioritize backlog. Clarity before code. No argument = prioritization pass alone.
---

# /wa-task

Fuzzy idea → clear grilled task, backlog ordered. Clarity before code.

Wording (screen + reports): **wa-board → Voice** — telegraphic, tech terms stay English.

Owns two things: **writing task** (steps 1–5), **placing it** (step 6). Prioritization not separate command — task not ordered isn't landed.

## Do

0. **Read arg.**
   - Free text → new task, steps below.
   - Slug or display index from wa-board list (`/wa-task 3`) → resolve per **wa-board → Task indexes**, echo `3 → sync-offline`, grill that existing task instead of creating, then step 6.
   - Bare arg matches **live sprint**, no task slug → ambiguous, ask which (recommend: new task inside that sprint, since `/wa-task` creates): `login-refacto is a sprint. New task inside it (recommended), or do you want the view? → /wa-board login-refacto`.
   - **No arg → prioritization only.** Skip to step 6, whole backlog in scope, full pass (see *Explicit run* there).
1. Read `.whackagent/config.md` + `{wiki}/index.md` for project context. `{…}` paths come from its `paths:` block — see **wa-board → Paths**.
2. **Title first.** Distill request into SHORT explicit title — feature clear one glance ("Login Apple", not "improve auth"). Rules: **wa-board → Titles and summaries** — label ≤ 5 words, never a narrative sentence, never a metaphor, tech terms untranslated. Slug = kebab-case title (`login-apple`).
3. **Grill.** Invoke **grill-me** skill: interview user relentlessly down design tree, one question at time. Resolve scope with **YAGNI** — push back on speculative. Question answerable from code → **go read code** (targeted Grep/Glob, scoped to feature). Never ask user what project already tells you.
   - **Every question carries recommendation. No exception.** See *Grill question format* below — bare question is bug, not style choice.
   - **Cover architecture.** Grill must settle *where this lives*: which feature/folder, what new files/folders, how fits architecture module (group by feature, proper nesting — not flat), which layer boundaries touch. Read architecture module in `{conventions}/` first, so grill against real rules.
   - Exception: user flags trivial quick win → skip grill, create task `grilled: false`.
4. **Write task file** at `{tasks}/<slug>.md` from `${CLAUDE_PLUGIN_ROOT}/templates/task.md`:
   - `title`, `status: todo`, `grilled: true` (or false if skipped), `created` = today.
   - `summary` — **≤ 8 words**, the goal plainly (line 2 of wa-board list). Adds what title doesn't say — never repeats it. Result once done, not mechanism or story. Rules: **wa-board → Titles and summaries**.
   - `size` — effort estimate: `quickwin` (🟢, hour or less), `medium` (🟡), `large` (🔴, multi-session / probably split). Base on what grill surfaced.
   - `sprint` — kebab-case label, or **empty**. Rules in *Sprints* below. Default empty: most tasks stand alone.
   - `wiki:` — link relevant existing wiki pages with `[[page]]`; note any page to create.
   - Fill `## Context / Decisions` with resolved decisions from grill.
   - Fill `## Acceptance criteria` — observable checks meaning "done" (what appears on screen, what input must produce). These drive the implementer's runtime checks and the verifier's correctness lens; keep concrete, YAGNI. Skip only for tasks with no runnable surface (pure lib/logic).
5. **Add to backlog.** Append task under **Todo** in `{backlog}`, link file (relative to backlog's own folder, so link works when backlog and tasks sit in different trees). Sprint set → echo as `· <sprint>` after link, slot line **next to its sprint siblings**, not bottom.
6. **Prioritize.** Run pass below — always, never ask permission, part of adding task. Several tasks one go → one pass at end, not one per task.

## GitHub provider

`backlog.provider: github` — rules in **wa-board → Backlog provider**. Same grill, same task file content; what changes is where it goes and who may touch it.

**Arg forms:** free text → new ticket. `#12` / `12` / display index → existing ticket. `release <n>` → stale-claim cleanup (below). No arg → prioritization pass.

1. **New ticket** → `wa-backlog create --title … --summary … [--size] [--sprint]` right after step 2 (title), before grilling — ticket visible on board at once. Then continue with it as existing ticket. User flags quick win to skip grill → no interview, but still claim, write minimal spec (context one line, 1–3 acceptance criteria from title + summary) and push (steps 2–5): coding claim needs `grilled`, and only a pushed spec gets there.
2. **Claim** → `wa-backlog claim <n> grilling`. Exit 3 → `#12 grilled by <agent> since <time>` — stop, suggest next `todo`. Exit 4 → state not `todo`, say which, stop.
3. **Branch** → fork point per `/wa-code` step 0 (`branch.base`, or `sprint/<sprint>` when ticket has milestone). Dirty tree → stop and ask. Create it **linked to issue**, right away: `gh issue develop <n> --name <branch.prefix><n>-<slug> --base <fork point> --checkout` (or `--worktree <path>` instead of `--checkout`). GitHub creates remote branch at fork point and lists it under issue **Development** — visible from first minute. Only way to link: branch created any other way (plain `git checkout -b`, then push) can never be linked afterwards. Empty branch push moves nothing (hook needs spec).
4. **Grill** (step 3), **write** `{tasks}/<n>-<slug>.md` (step 4) with GitHub frontmatter: `issue: <n>`, `phase:` empty, `wiki:`, `note:`, `created:`. Title/summary/size/sprint → `wa-backlog set-field` / GitHub issue, never file. Dependencies grill settled (`Depends on #x` in `note:`) → **also** `wa-backlog depend <n> --on <x>[,<y>]` at once, so issue Relationships show blocking graph. Split children blocked by sibling they build on → same verb. `## Acceptance criteria` **must** be non-empty — hook reads it as proof grill finished.
5. **Commit + push, once, at end.** Commit only task file (`task: grill #<n> <slug>`), author per `commit.author_*`, push `-u origin`. Never push mid-grill. Hook moves ticket to `grilled` and drops grilling claim — confirm with `wa-backlog get <n>` (wait ~30 s, re-read once; still `grilling` → say hook late, check Actions run, never set state yourself).
6. **Abort** (user drops mid-grill) → `wa-backlog release <n> grilling --reset-to todo --reason "<why>"`, delete branch if spec never pushed — local, plus remote one `gh issue develop` created (`git push origin --delete <branch>`: holds only fork point).
7. **Split** (large ticket) → children = new tickets via `create`, same sprint milestone. Parent: `release`, then close issue with comment linking children — never leave parent claimed.

**Prioritization (step 6) under GitHub:** **not automatic.** Board order shared with humans and other agents — new ticket lands bottom of `todo`, full stop. Only explicit `/wa-task` (no arg): re-read `wa-backlog list` just before writing, show proposed order, apply with `wa-backlog move` **only on user yes**. Cancel = close issue `not planned` with reason comment, on yes.

**`/wa-task release <n>`** — stale claim cleanup, human-triggered only. Show `wa-backlog claims` row (owner, age, last push), confirm, then `release <n> <phase> --reset-to <todo|grilled> --reason "stale: <age>, no push"` (`grilling` → `todo`, `coding` → `grilled`). Never on own initiative, never to take ticket another live agent holds.

## Sprints

Optional grouping label for work too big for one task — `sprint: login-refacto`. Canonical rules in **wa-board → Sprints**; here is when to set it.

**Set a sprint when:**

- user names one (*"it's for the login refacto sprint"*) → take their words, kebab-case them;
- task is `large` and grill just split it, or about to → split children share one sprint (below);
- task obviously belongs to work already in flight → existing sprint's tasks touch same feature/screen. **Propose it, one line, don't assume**: `📎 Belongs in sprint login-refacto?`

**Leave empty otherwise.** Sprint of one task is noise. Most tasks stand alone — empty is default, `quickwin` almost never needs one.

**Naming**: kebab-case, names *body of work*, not first task (`login-refacto`, not `login-apple`). Reuse existing sprint verbatim rather than coining near-duplicate — check live `sprint:` values before minting new label.

**Never** create sprint file, sprint section in `{backlog}`, or sprint status. Label on tasks *is* sprint.

## Grill question format

**Never ask bare question.** Every grill question ships with answer you'd pick and why. User job: confirm or correct — not design feature from blank prompt. Not "when you have opinion": always.

```
**Where does the token live?**
→ **Recommended: Keychain.** Refresh token survives reinstall-less relaunch, and
  UserDefaults would put it in plaintext backups.
  Alt: in-memory only — safer, but user re-logs at every cold start.
```

Rules:

- **Recommendation, then one-line why.** Why makes it reviewable — naked "I'd do X" gives user nothing to push against.
- **Name alternative you rejected** when real one exists, one line. Shows fork actually considered.
- **Cite ground.** Recommendation follows from something concrete: convention module, existing code you read, acceptance criteria, YAGNI. Never coin flip dressed as advice.
- **No basis to recommend?** Still recommend: give least-risk / most-reversible default, say plainly what you'd need to know to be sure. "It depends on your product intent" alone is non-answer — pick cheapest-to-undo option, flag as guess.
- **One question at a time.** Recommendation attached to each. Batch of five bare questions = exact failure this rule stops.
- Same rule for any question outside grill — architecture forks, `BLOCKED:` questions from subagents, `/wa-feedback` triage doubts.

## 6. Prioritization pass

Product-owner hat: what matters now, what order. New task(s) from this run = **focus**; rest of todo = context.

1. Read `{backlog}` + `todo` task files (config already read).
2. Each todo task, challenge with **YAGNI**: _need now?_ Three outcomes:
   - **keep** — stays in todo.
   - **defer** — keep but push down order.
   - **cancel** — set `status: canceled`, move under Canceled, note why.
3. **Split** when task too big for one coherent feature: create child task files (`<slug>-<part>.md`), link to parent via `note:`/`wiki:`, mark parent `canceled` or keep as umbrella — your call, tell user.
   - **Children inherit sprint.** Parent had one → every child gets same `sprint`. Parent had none → split *is* reason sprints exist: name one after body of work parent described (`login redesign` → `login-refacto`), set on all children, say so in one-line split proposal. Parent kept as umbrella → carries sprint too.
4. **Re-estimate size** when picture changed (`large` 🔴 task split may now be `medium`/`quickwin`). Update each task `size`.
5. **Reorder.** Order in **Todo** section = priority (top = next). No numeric labels in `{backlog}` — order alone carries priority. Reflect new order in `{backlog}`.
   - **Sprint moves as block.** Its tasks stay contiguous in section, own internal order (dependencies first). Prioritize *sprint* against rest, then tasks inside. Splitting sprint across order needs reason — say out loud (*"pulled login-apple out of the block: it unblocks onboarding"*).
6. **Tighten titles + summaries.** Any task in pass whose `title` or `summary` breaks **wa-board → Titles and summaries** (narrative sentence, metaphor, translated tech term, summary > 8 words) → rewrite it, silently. Slug doesn't change.
7. Show result using **wa-board list format**. `#` display-only, recomputed from order just written — always print list after reordering so indexes user sees are current. Sprints in play → progress lines under legend.

**Cheap and quiet by default** — user asked for task, not backlog audit:

- Slotting focus task vs existing ones: silent, no narration.
- Reorder + re-estimate: apply freely, reversible, order is whole point.
- **Assigning sprint user didn't name: propose, never silent** (one line, same as cancel/split). Sprint they named, or one inherited by split they already approved: silent.
- **Cancel or split: never silent.** Propose one line each (`⚠️ sync-offline looks like 3 tasks — split?`), do only on yes. Applies to focus tasks and any existing task pass flags.
- No before/after diff; one list (the after) enough.
- Single todo task → nothing to order, skip straight to list.

**Explicit run** (`/wa-task` no arg, or user asks reorder): full pass over everything, show **before/after** lists plus rationale for any cancel/split.

## Stop and ask

Whole skill about no guessing. User answers leave contradiction → surface it, no paper over.

Priority call needs product intent you lack? Ask — no assume. But on automatic pass, ask only if new task slot genuinely undecidable; else put where best fits, let user move it.

## Next step

Board list from step 7 already on screen with fresh `#` indexes. Suggest **`/wa-code <#>`** for top grilled todo (or `/wa-autopilot <#,#>` if new tasks are quick wins).
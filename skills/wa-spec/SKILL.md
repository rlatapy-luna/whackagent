---
name: wa-spec
description: Read a spec and cut it into one or more tasks ready to grill — coarse feature cut, never ticket shredding. Spec already focused → one task through /wa-task.
---

# /wa-spec

Big spec → few tasks, each one coherent feature, ready for `/wa-task` grill. Entry: `/wa-spec <spec>`, or `/wa-task` routing a spec here. **Cut, don't shred**: goal = split spec too large for one task, never break feature into small tickets. Focused spec → one task, `/wa-task` owns it.

Wording (screen + reports): **wa-board → Voice** — telegraphic, tech terms stay English.

## Arg

Path to spec (md, txt, pdf, docx…), URL, or pasted text. None → ask for it (recommend: file path — excerpts stay traceable to their source). Read **whole** spec — ranges when big, never judge from first page.

## Do

1. **Context.** Read `.whackagent/config.md`, `{wiki}/index.md`, backlog (`{backlog}`, or `wa-backlog list` under GitHub — **wa-board → Backlog provider**). Know what already exists: task covering part of spec → reuse, never duplicate. Note live sprints. `{…}` paths per **wa-board → Paths**.
2. **Map spec.** List its blocks: user-visible capability each delivers, spec sections it spans, what it depends on. No deep code exploration — grill does that. Targeted glance only when unsure a block already exists in code.
3. **Decide cut** per *Cut rules*. **One task → say `spec focused → one task`, continue `/wa-task` from step 1 with spec as its description — no re-route to here.** Its grill starts from spec, asks only what spec leaves open.
4. **Propose**, one block, before writing anything — see *Proposal*.
5. **Create on yes**, per task, `/wa-task` steps 2, 4, 5 **minus grill**:
   - **local** — task file from template: `title`, `summary`, `size`, `sprint`, `status: todo`, `grilled: false`, `created`; `note:` `Depends on <slug>` when it builds on another. `## Context / Decisions` = **spec excerpt** (below). `## Acceptance criteria` left empty — grill writes them. Line under **Todo** in `{backlog}`.
   - **GitHub** — `wa-backlog create --title … --summary … --size … --sprint … --note "<spec excerpt>"` (note = issue body), then `wa-backlog depend <n> --on <x>` per dependency. Ticket stays `todo`: no claim, no branch, no task file — `/wa-task <n>` grill makes them.
   - **Existing task covering a block** → append excerpt (local: its `## Context / Decisions`; GitHub: `gh issue comment`). Never rewrite it.
6. **Prioritize** once at end — `/wa-task` step 6, new tasks = focus, sprint moves as block.
7. **Show** list (wa-board format, fresh `#`). Next: `/wa-task <#>` to grill top one — one task at a time.

## Cut rules

Task = one coherent feature: user tests it alone, one `/wa-code` pipeline, one PR, one review diff.

- **Split only at feature seams** — separate screen, flow or subsystem that ships and tests on its own. Spec already treating it as separate part = strong signal.
- **Never split by layer** (data / domain / UI), by file, or into steps of one feature — pieces untestable alone. Inner decomposition = grill + `/wa-code` bricks.
- **Never shred** — no task per acceptance criterion, field, button or edge case.
- **Doubt between one and two → one.** Grill can still split later (`/wa-task` step 6); merging back costs more.
- **Size bound** — block beyond `large` (many sessions, many screens) → split. Everything fits `medium`/`large` → one task fine, even when spec long.
- **Count check** — big spec usually 2–6 tasks. Past ~8 → probably shredding: cut coarser, or say spec = several sprints and cut first one only.

## Proposal

```
Spec: docs/specs/timesheet-v2.md — 3 tasks · sprint timesheet-v2

1. 🟡 Weekly timesheet — edit week entries in one grid      §2 §3
2. 🔴 Timesheet export — month as PDF and CSV              §5    ← after 1
3. 🟡 Week approval — manager approves or rejects week     §6    ← after 1

Already in backlog: §4 offline edit → sync-offline (excerpt appended)
Out of task: §7 analytics — spec says "later" (YAGNI)
Open for grill: §5 PDF branding? · §6 notify by mail or push?

→ Recommended: these 3. §2–§3 same screen; export and approval ship and test alone.
  Alt: merge 1+3 — approval sits on same grid, but doubles review diff.
ok? [y / edit]
```

- **Every spec section lands somewhere** — a task, an existing task, or `Out of task` with reason. Nothing silently dropped.
- Title + summary per **wa-board → Titles and summaries**. Size from spec breadth, re-estimated at grill.
- Order = dependency order; `← after N` when one builds on another.
- **Sprint** — several tasks from one spec → one sprint named after body of work, rules **wa-task → Sprints** (reuse live one when spec extends it). Shown in header, confirmed with proposal.
- **Ambiguities → `Open for grill`**, not asked now: grill's job, one task at a time.
- `edit` → user reshapes (merge, split, rename, drop); re-show block, create only on yes.

## Spec excerpt

What grill starts from — `/wa-task` reads it instead of re-asking what spec already says.

```
**Spec** — docs/specs/timesheet-v2.md §5 (Export)
<sections this task covers, verbatim or tightened — never new requirement>

**Open for grill**
- PDF branding: logo or plain?
```

- Source ref always: path + sections, or `pasted spec` + date when no file.
- Tighten wording, never add scope. Requirement spec doesn't state = not in excerpt.
- Cross-task context (shared model, data another task creates) → one line naming that task.

## Never

- Never grill here — tasks leave `todo`, `grilled: false`. Grill = `/wa-task`, one task at a time.
- Never write acceptance criteria, never code, never create branches.
- Never create anything before yes on proposal.
- Never invent requirement spec doesn't state.
- Never write to literal `.whackagent/` path when config `paths:` points elsewhere.

## Asking

Every question carries recommended answer plus one-line reason — cut choice, sprint name, spec missing. Never bare question.

## Next step

`/wa-task <#>` on top new task — grill starts from its spec excerpt. Then `/wa-code`.

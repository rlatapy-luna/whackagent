---
name: wa-pitch
description: Kick off project from pitch — grill it (user, core loop, v1 cut, surfaces, data, stack), write wiki pitch page, seed glossary, optional UI preview. /wa-task then cuts page into tasks.
---

# /wa-pitch

Pitch → grilled scope → `{wiki}/pitch.md` + glossary seed (+ UI preview) → **`/wa-task`** cuts it into tasks and sprint. Owns pitch page and glossary seed only: never creates tasks, never touches board. Single idea → `/wa-task` straight.

Read `${CLAUDE_PLUGIN_ROOT}/reference/`: `voice.md` `paths.md`. File already read this session, still in context (earlier skill run, no compaction since) → don't read again.

Wording (screen): **reference/voice.md** — telegraphic, tech terms stay English. Pitch page: plain sentences (*Pitch page*).

## Do

1. **Read arg** — pitch text, any shape. Empty → ask `Pitch the project: what, for whom, why.`, stop.
2. **Context** — config `.lunabee/agents/config.md`, paths per **reference/paths.md** (not set up → suggest `/wa-setup` first, stop). `{wiki}/index.md`.
   - Code there → skim entry point, folders, deps. Never ask what repo tells.
   - `{wiki}/pitch.md` exists → re-pitch: say so, grill only what changes, update page (+ preview).
3. **Grill** — **grill-me** skill (absent → interview inline), one question at a time, each with recommendation per **wa-grill → Question format**. Order:
   1. **Who + problem** — one user, one pain. Vague → push back.
   2. **Core loop** — the one thing done every open.
   3. **v1 scope** — YAGNI hard: not needed by core loop → `Later`. Recommend the cut.
   4. **Surface** — screens, what's on each, moves between them; CLI commands + output; endpoints / public API.
   5. **Data** — what, where, accounts, offline.
   6. **Stack + skeleton** — platforms, min OS, frameworks, services. Read architecture module(s) from `review.modules` first (**reference/paths.md**); name top-level folders. Answer contradicts `primary_language` / `project_kind` → say so, suggest `/wa-setup` after; never edit config.
   7. **Out of scope** — written down.
   - Stop when each v1 feature fits one line on a screen / command / endpoint. Feature detail → `/wa-grill` per task, later.
   - User cuts short → your picks, under `## Open guesses`.
4. **Preview** (optional) — UI project (`project_kind` `app` / `web`, or pitch has screens) → offer once: *"preview v1 screens before writing page? (recommended: yes — scope you see is scope you cut right)"*. Non-UI → skip silently.
   - Yes → **`/wa-proto`** inside pitch, per its *Musts*: one proto, source `{wiki}/protos/pitch.html`. `Screen` control, one screen per v1 feature, core-loop order. Key states (empty, filled) → `State` control. Nothing from `Later`.
   - Say once: features, not brand.
   - Screen added, dropped, reshaped = scope change: page follows.
   - UI project, `{conventions}/wording.md` absent → one line `/wa-setup wording adds UI copy rules`. Never copy modules here.
5. **Write pitch page** → *Pitch page*. Link in `{wiki}/index.md`: `- [[pitch]] — what we build, for whom, v1 scope`.
6. **Seed glossary** — `{wiki}/glossary.md` absent → copy `${CLAUDE_PLUGIN_ROOT}/templates/glossary.md` (no UI → drop `## Screens`), `[[glossary]]` line in `{wiki}/index.md`. Propose rows in one block: grill's core concepts → **Concepts**, `## Screens` → **Screens**. Written on yes (recommended: yes — tasks, grill, code and PRs use same word from day one). Rows already there untouched. Only those terms after.
7. **Hand off** — page = spec. **wa-task → Spec** cuts it: tasks, sprint, order, `Out of task` for `Later` / `Out of scope`; several sprints' worth → cuts first one. Shared board: page stays uncommitted here; each ticket carries its excerpt.

## Pitch page

`{wiki}/pitch.md`, `discussion_language`, readable cold, one screen. Plain sentences, never compressed whatever `compress_wiki`: team reads it, `/wa-task` cuts from it.

```markdown
# Pitch — <Project>
<one sentence: what, for whom>
## Problem
## Core loop
## v1
- <feature> — <one line>
## Screens        ← `## Commands` / `## API` if not UI
- <screen> — <what's on it>
## Data
## Stack
## Out of scope
## Later
## Open guesses   ← grill cut short only
## Preview        ← preview made only: [pitch](protos/pitch.html) + artifact link
```

## Ask

- Pitch contradicts itself or code → surface it as question with recommendation, never pick silently.

## Never

- Never create task, sprint, branch or claim. Never touch board or task state. `/wa-task` creates, on its own proposal's yes.
- Never write any task's `## Context / Decisions` or `## Acceptance criteria`.
- Never code, scaffold, install, edit config or convention modules.
- Never commit. Files stay in tree.

## Next step

`/wa-task <resolved {wiki}/pitch.md path>` — cut into tasks (**reference/voice.md → Next line**: real path, backticked).

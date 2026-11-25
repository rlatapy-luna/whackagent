---
name: wa-proto
description: Prototype UI idea as Claude artifact — light/dark, controls panel for states and variants, real content, target platform look. Standalone; inside /wa-grill, links proto in task spec.
---

# /wa-proto

UI idea → clickable proto, published as Claude artifact. Free design; few musts. Standalone: claims nothing, writes no task file, changes no state.

Read `${CLAUDE_PLUGIN_ROOT}/reference/`: `voice.md` `paths.md` · arg is display index → + `display.md`. File already read this session, still in context (earlier skill run, no compaction since) → don't read again.

Wording (screen): **reference/voice.md** — telegraphic, tech terms stay English. Proto content: **wa-wording**.

## Do

1. **Pick subject.**
   - `<idea>` → that idea.
   - `<task>` (slug, display index, ticket id per **reference/display.md → Task indexes**) → read only: its title, `## Context / Decisions`, `## Acceptance criteria` (task file; shared board without task file yet: `wa-backlog get <id>`), glossary **Screens**.
   - No arg → what conversation is on now: last exchanges, open grill question, feedback note. Not whole task.
     - Say it, one line, no question: `Proto: Composer, empty vs reply`.
     - No UI in sight → ask for idea, stop.
2. **Load context.**
   - Config `.lunabee/agents/config.md` → paths per **reference/paths.md**. Read `{wiki}/glossary.md` and `{conventions}/wording.md` (**Project voice**, **Validated examples**) when present, `verify.platform`, `ui_strings_language` (empty → `discussion_language`).
   - Repo has a look (colors, fonts, components, design system) → start from it.
   - No config → infer from repo and strings, never stop.
3. **Build** → *Musts*. Everything else yours: layout, style, framing, how controls look.
4. **Save** source.
   - Config → `{wiki}/protos/<slug>.html`. Subject from task → `<task slug>-<subject>.html`.
   - No config → scratchpad, say where.
5. **Publish** as Claude artifact (Artifact tool), give link. Rework → same source, same URL.
   - No artifact tool → open source locally, give path.
6. **Ask** once: `Proto OK, or changes?` + own doubt as recommendation, format **wa-grill → Question format**.
   - Notes → edit, republish, ask again.
7. **Link** — only inside `/wa-grill` run (grill holds claim and task file): hand grill line `Proto: <artifact link> · {wiki}/protos/<file>` + decisions proto settled. Grill writes them into `## Context / Decisions` with its own decisions. Run alone → links nothing.
8. **Resume** — called inside skill (`/wa-grill`, `/wa-pitch`) → back to its open step, question where it stopped.

## Musts

- **Light / dark** toggle. Both themes designed, not one inverted.
- **Controls panel** — everything idea can vary:
  - states (`empty`, `filled`, `error`, `loading`), variants (`A | B`)
  - customization: colors, density, type, copy, sizes
  - labels in `discussion_language`
- **Real content** in UI strings language, glossary terms, **wa-wording** ladder. Never lorem ipsum, `Title`, `Button`.
- **Platform** (`verify.platform`): size and idioms of target (`ios` → iPhone screen, `android` → Material phone, `web` → browser viewport). Style free.
- **Interaction**: only what judging idea needs. No backend, no fetch.
- Name = subject + `· v<n>`, bumped on each rework.

## Never

- Never two protos for variants: one proto, variant control.
- Never touch project code, task file, task state or claims.
- Never commit. Source stays in tree; user decides.

## Next step

- Standalone, idea → `→ next: /wa-task <idea>` (**reference/voice.md → Next line**).
- Standalone, task → `→ next: /wa-grill <#>` when not grilled, else none.
- Inside skill → back to it, no Next line.

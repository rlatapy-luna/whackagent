---
name: wa-wording
description: Craft UI copy the way a senior UX writer would — short, native, on-mood, or no text at all when the UI can show it. Use whenever you write, edit or review any user-facing text in an interface (button labels, titles, subtitles, empty states, errors, alerts, confirmations, toasts, loading, onboarding, paywalls, permission prompts, localization catalogs), including while building a new screen or component even if the user never mentioned wording.
user-invocable: false
---

# /wa-wording

Auto-loads on UI copy written outside task pipeline. Best copy absent: text says only what UI cannot show.

Read `${CLAUDE_PLUGIN_ROOT}/reference/`: `voice.md` `paths.md`. File already read this session, still in context (earlier skill run, no compaction since) → don't read again.

- Inside pipeline, `wa-implementer` and `wa-verifier` get these rules from `wording.md` module in `review.modules`. This skill = same rules, for UI written in chat, `/wa-proto`, `/wa-pitch`.
- `wording/` below = project's `{conventions}/wording/` when present, else `${CLAUDE_PLUGIN_ROOT}/conventions/wording/`.
- Chat about the copy follows **reference/voice.md**. Copy itself follows project voice.

## Do

1. **Load context.**
   - Config `.lunabee/agents/config.md` exists → `{conventions}`, `{wiki}` per **reference/paths.md**. Read:
     - `{conventions}/wording.md` → **Project voice** (`languages`, `person`, `base`, `audience`, `situations`), **Voice**, **Validated examples** (before `wording/tones.md`).
     - `{wiki}/glossary.md` → **Concepts** terms. Glossary always wins.
     - `ui_strings_language` (empty → `discussion_language`) when module absent.
   - Neither file → never stop, never ask:
     - infer tone, person, language from existing strings
     - defaults: `base: neutral`, platform vocabulary
     - project set up, UI, no module → say once, one line: `/wa-setup wording adds UI copy rules`.
   - Detect stack (SwiftUI, UIKit, web, Compose) and string location (inline, `.xcstrings`, `Localizable.strings`, i18n JSON, `strings.xml`).
2. **Ladder** each string, in order, stop at first rung that works (`wording/ladder.md`):
   1. **Remove** — understood without it? Title repeating button, subtitle repeating title, text explaining visible UI → delete.
   2. **Show** — visual carries it? Icon, button state (disabled, spinner, checkmark), badge, color, haptic, animation, native empty state (`wording/visuals.md`).
   3. **Shorten** — minimum words. Buttons are verbs. Word over sentence.
   4. **Tune** — base tone, or detected situation's tone (`wording/situations.md`, `wording/tones.md`).
   - Then reject `wording/blacklist.md`: narrating what app did, explaining UI, filler politeness, vague reassurance, dev jargon, echoing user's action.
3. **Write native** (`wording/native.md`, that language only).
   - Words user says aloud, platform vocabulary.
   - Common English loanwords over invented or stiff equivalents.
   - Each language's typography (French non-breaking spaces as escapes).
4. **Apply** silently to strings you write: no report, no questions.
   - Localization → `wording/i18n.md`.
   - Text → icon → text kept as accessibility label (`accessibilityLabel`, `aria-label`, `contentDescription`).
   - Structural change on existing UI (remove string, text → icon, add element, remove localization key) → propose first, one line each, recommended answer + why.
5. **Learn** — only with `{conventions}/wording.md` present, always asked first:
   - User rewrites string you wrote → offer row in **Validated examples** (`before → after · situation`, max 2 per situation) *"keep as example? (recommended: yes — next strings copy your voice)"*.
   - Term used consistently in code, missing from glossary → propose row, same wording as **wa-task → Do** step 2, *Glossary*.

## Never

- Never remove or shorten past meaning: irreversible destructive action (name what is lost), error (say what to do), legal, consent, pricing.
- Never draft in English and translate.
- Never rewrite existing copy outside what user asked.
- Never edit `wording/` pages: plugin text, refreshed by `/wa-setup`.

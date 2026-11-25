# Wording — UI copy

> Convention module · UI projects only · lens: **style**, **correctness** (see *Reviewing*). Implementer writes every user-facing string against it, verifier judges them. Edit **Project voice** per project. Reference pages sit in `wording/`, next to this file: reference library, open one page per topic, never whole.

Great interface copy mostly **absent**. Every string earns its place. UI shows; text says only what UI cannot.

Applies to every user-facing string: button labels, titles, subtitles, empty states, errors, alerts, confirmations, toasts, loading, onboarding, paywalls, permission prompts, accessibility labels, localization catalogs.

## Project voice

Written by setup, yours to edit.

```yaml
languages: [en]          # UI languages, source first — mirrors ui_strings_language in config
person: impersonal       # tu | vous | impersonal (per language when needed: {fr: tu, de: du})
base: neutral            # neutral | sober | complice | premium | energetic | custom
audience: general        # general | tech | young | pro
situations:              # override tones only; guardrails fixed (wording/situations.md)
  destructive: serious
  error: calm
  payment: neutral
  permission: base
  empty-state: base
  success: base
  onboarding: base
  legal: neutral
```

**Voice** — two or three sentences on how app talks. Allowed / forbidden: emoji, exclamation marks, humor.

<!-- to review -->

**Validated examples** — strings user rewrote, `before → after · situation`. Max 12, 2 per situation. Read before `wording/tones.md`: this project's voice beats generic tone.

<!-- - "Your trip has been saved!" → (removed, checkmark) · success -->

## The ladder — every string

Go down in order, **stop at first rung that works**. Most strings stop at 1 or 2. Details + before/after: `wording/ladder.md`.

1. **Remove** — user understands without it? Title repeating button, subtitle repeating title, text explaining what UI shows → delete.
2. **Show** — visual can carry it? Icon, button state (disabled, spinner, checkmark), badge, color, haptic, native empty-state component → replace. Rules: `wording/visuals.md`.
3. **Shorten** — text needed → minimum words. Buttons are verbs. No sentence where word works.
4. **Tune** — apply `base` tone, or tone of detected situation.

Then reject anything in `wording/blacklist.md`. Worst offenders:

- narrating what app did: "Your changes have been saved successfully"
- explaining how UI works: "Tap the button below to…"
- filler politeness, vague reassurance, dev jargon, repeating what user just did

**Text required** — never remove, never shorten past meaning:

- irreversible destructive action: name what is lost
- error: say what to do
- legal, consent, pricing

## Words

- **Glossary wins.** Project glossary (wiki `glossary.md`, path handed with modules): **Concepts** term, never a `Never` word. **Screens** = team names, not UI copy.
- New concept, no glossary entry → word user says out loud, flagged in `NOTES:` so it gets added.
- **Write native, never translate.** Write directly in target language: words target user says out loud, platform vocabulary, common English loanwords over invented or stiff equivalents. Rules per language: `wording/native.md`.
- Language typography (French non-breaking space before `? ! : ;`, written as escape) → `wording/native.md`, that language only.

## Read on demand, never whole

| You touch | Open |
|---|---|
| any string you're unsure about | `wording/ladder.md` |
| text replaced by icon / state / native component | `wording/visuals.md` |
| delete, error, payment, permission, empty state, success, loading, onboarding, legal | `wording/situations.md` — that situation only |
| tone other than `neutral`, or doubt on tone | `wording/tones.md` — that tone only |
| any language other than English | `wording/native.md` — that language only |
| localization catalog, keys, several languages | `wording/i18n.md` |
| final check on copy you wrote | `wording/blacklist.md` |

Diff with no user-facing string → open nothing.

## Scope

- Strings task creates or changes. Never rewrite unrelated existing copy.
- Text replaced by icon → **text always kept as accessibility label** (`accessibilityLabel`, `aria-label`, `contentDescription`).
- Never add dependency, never add language that doesn't exist yet, never introduce i18n system project lacks.
- Icon names: verify they exist (SF Symbols, Material, project icon library). Never invent one.

## Reviewing

Lens:

- situation guardrail broken (destructive without object + consequence, error without next step, price or renewal unclear, consent buttons unequal) → `correctness`
- glossary term replaced by synonym, hardcoded string bypassing project catalog, missing accessibility label on icon-only control → `correctness`
- anything else (blacklist pattern, string that should be removed or shown, too long, off-tone, translated-sounding) → `style`

Finding names string and rewrite, cites page:

```
Views/TripRow.swift:42: 🟡 minor: [style] "Your trip has been saved successfully!" narrates app. Remove, checkmark on button — wording/blacklist.md.
Views/TripDetail.swift:88: 🟠 major: [correctness] Delete alert "Are you sure?" names nothing. "Delete “Lisbon”?" + "12 photos will be deleted." — wording/situations.md.
```

Existing copy diff doesn't touch → not finding.

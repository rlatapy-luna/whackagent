# Tones

Five tones. Tone changes **word choice and rhythm, never length**. Every tone still obeys ladder and blacklist.

`base` values in `wording.md` → **Project voice**: `neutral`, `sober`, `complice`, `premium`, `energetic`. Custom tone → `base: custom`, free text in **Voice**.

Situation-only tones (`situations.md`, not selectable as base): `serious`, `calm`.

Samples below are English. Other language → same intent, written native (`native.md`), never translated from these.

## neutral
Clear, factual, no personality. Safe default.
- Nouns and verbs, no adjectives. No humor. No exclamation marks.
- **Red line**: never cold to point of blaming ("Invalid", "Denied").

| Empty | Error | Button | Destructive |
|---|---|---|---|
| "No projects" | "Offline. Try again" | "Create project" | "Delete “Trip”? 12 photos will be deleted." |

## sober
Minimal, calm, almost silent. Maximum removal, single words, lots of visuals.
- One word when possible. No sentence outside required text.
- **Red line**: never cryptic — single word still unambiguous.

| Empty | Error | Button | Destructive |
|---|---|---|---|
| "Empty" | "Offline" + retry icon | "New" | "Delete “Trip”? 12 photos lost." |

## complice
Warm, light, touch of humor. Talks like friend who respects your time.
- Informal phrasing, occasional wit on low-stakes moments (empty states, onboarding, success).
- **Red line**: never jokes on errors, loss, money, anything destructive. Never cutesy ("Oopsie"). Humor never adds length.

| Empty | Error | Button | Destructive |
|---|---|---|---|
| "Nothing here yet." | "Offline. Try again?" | "Let's go" | *(serious applies)* "Delete “Trip”? 12 photos will be gone." |

## premium
Elegant, composed, carefully chosen words. Confidence without hype.
- Precise vocabulary, calm rhythm, slightly more evocative nouns. No slang, no exclamation marks, no emoji.
- **Red line**: never pompous or marketing-speak ("Elevate your experience"). Elegance = restraint.

| Empty | Error | Button | Destructive |
|---|---|---|---|
| "Your first project awaits." | "Connection unavailable. Try again" | "Begin" | "Delete “Trip”? Its 12 photos will be permanently removed." |

## energetic
Direct, dynamic, motivating. Imperatives, momentum.
- Action verbs first, short punchy fragments. Exclamation marks only on genuine achievements.
- **Red line**: never pushy or guilt-tripping ("Don't give up now!", fake urgency).

| Empty | Error | Button | Destructive |
|---|---|---|---|
| "Start your first project" | "Offline. Retry" | "Start" | *(serious applies)* "Delete “Trip”? 12 photos will be deleted." |

## serious — situation only
Plain, precise, zero personality. Destructive actions, whatever base tone.
- Name object, state consequence, exact verb on button.

## calm — situation only
Steady, blameless, solution-first. Errors.
- Never "you did", never humor, never alarm. What to do next.

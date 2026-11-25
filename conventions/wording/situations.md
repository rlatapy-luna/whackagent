# Situations

Detect situation from code, apply its tone and guardrails. No need to ask.

- **Tone** overridable per project: `wording.md` → **Project voice** → `situations:`. `base` = inherit base tone.
- **Guardrails fixed.** Config cannot disable them.

| Situation | Detection signals | Default tone |
|---|---|---|
| `destructive` | `role: .destructive`, `.destructive` style, delete/remove/reset/erase/revoke/unsubscribe/leave, `variant="danger"`/`"destructive"`, red buttons | `serious` |
| `error` | `catch`, `Result.failure`, `.alert(isPresented:error:)`, error toasts/banners, `onError`, validation messages | `calm` |
| `payment` | paywall, checkout, subscription, StoreKit/`Product`, Stripe, price labels, trial | `neutral` |
| `permission` | camera, photos, notifications, location, contacts, tracking prompts, `NS*UsageDescription` | `base`, softened |
| `empty-state` | empty list/collection branch, `ContentUnavailableView`, `isEmpty` rendering | `base` |
| `success` | after save/send/create/copy completion handlers | `base` |
| `loading` | `ProgressView`, spinners, skeletons, `isLoading` | — |
| `onboarding` | first launch, welcome, tutorial, `hasSeenOnboarding` | `base`, most expressive |
| `legal` | terms, privacy, consent, GDPR/cookies, age gate | `neutral` |

## Guardrails

### destructive
- Title names object: "Delete “Trip”?" — never "Are you sure?".
- Message states what is lost, concretely: "12 photos will be deleted." Omit message only if nothing beyond object is lost.
- Confirm button = exact verb ("Delete", "Remove", "Leave"). Never "OK", "Yes", "Confirm".
- Cancel stays "Cancel" (platform word).
- No humor, no emoji, no softening ("Just so you know…").
- Undoable action → no confirmation + Undo affordance over dialog.

### error
- Say what to do, not what happened internally. "Offline. Try again", not "Network request failed".
- Never blame: no "You entered", "Invalid", "Wrong".
- Validation: state expectation. "8 characters minimum", not "Password invalid".
- Error at point of failure (inline under field) before alerts.
- No codes unless support needs them — then at end, secondary style.

### payment
- Price, period, renewal always explicit: "€4.99/month, renews automatically".
- Trial: what happens when it ends, and when.
- No fake urgency, no guilt on decline ("No thanks, I don't like saving money").
- Button says what happens: "Start free trial", "Subscribe for €4.99/month".

### permission
- One sentence: benefit to user, in their terms. "To scan documents", not "App needs camera access".
- Ask in context (moment of use); pre-prompt only if benefit not obvious.
- `NS*UsageDescription` strings: same rules, same language rules.

### empty-state
- Show first: icon or illustration from project.
- Max one line of text + one action. "No projects" + "Create project".
- Search empty: "No results" — plus query if helpful. No tips paragraph.
- Never explain feature at length here.

### success
- Default: **no text**. Result visible, or checkmark/haptic (`visuals.md`).
- Toast only with Undo, or when effect is off-screen and matters.

### loading
- No text, unless it lasts > ~2 s or has real steps ("Uploading 3 of 12").
- Never "Please wait", never fake steps.

### onboarding
- One screen = one idea. Title + at most one line.
- Show product, not description of it.
- Skip always available, labeled plainly.

### legal
- Clarity beats brevity. Never shorten to point of changing legal meaning.
- Never rewrite legal text from lawyer or policy source — only its surrounding UI (buttons, links, headings).
- Consent buttons symmetrical in weight: "Accept" / "Decline".
